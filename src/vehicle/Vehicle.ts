import Phaser from 'phaser';

export class Vehicle {
  private _throttle = 0;
  private _brake = 0;
  private _steerAngle = 0;
  private _heading = 0;
  private _acceleration = new Phaser.Math.Vector2(0, 0);
  private _accelerationC = new Phaser.Math.Vector2(0, 0);
  private _velocity = new Phaser.Math.Vector2(0, 0);
  private _velocityC = new Phaser.Math.Vector2(0, 0);
  private _absVelocity = 0;
  private _yawRate = 0;
  private _pathLength = 0;
  private _position = new Phaser.Math.Vector2(0, 0);
  private _inertia = 1200;
  private _speed = 0;

  private _cfg = {
    airResist: 2.5,
    brakeForce: 22000,
    cgHeight: 0.55,
    cgToFront: 2,
    cgToFrontAxle: 1.25,
    cgToRear: 2,
    cgToRearAxle: 1.25,
    cornerStiffnessFront: 5,
    cornerStiffnessRear: 5.2,
    eBrakeForce: 4000,
    engineForce: 18000,
    gravity: 9.81,
    halfWidth: 0.8,
    height: 1.5,
    inertiaScale: 1,
    length: 4.5,
    lockGrip: 0.7,
    mass: 1200,
    maxStreer: 70,
    rollResist: 8,
    tireGrip: 2,
    weightTransfer: 0.2,
    wheelRadius: 0.3,
    wheelWidth: 0.2,
    width: 2,
  };

  constructor(
    private _sprite: Phaser.GameObjects.Sprite,
    private _path: Phaser.Curves.Path,
    private _cursors: Phaser.Types.Input.Keyboard.CursorKeys
  ) {
    this._sprite.setPosition(this._path.getStartPoint().x, this._path.getStartPoint().y);
    const t = this._path.getTangent(0).angle();
    this._sprite.setRotation(t + Math.PI / 2);
    this._pathLength = this._path.getLength() / 40;
  }

  update(time: number, delta: number) {
    delta = delta / 1000;

    this._throttle = this._cursors.up.isDown ? 1 : 0;
    this._brake = this._cursors.down.isDown ? 1 : 0;

    const sin = Math.sin(this._heading);
    const cos = Math.cos(this._heading);

    this._velocityC.x = cos * this._velocity.x + sin * this._velocity.y;
    this._velocityC.y = cos * this._velocity.y - sin * this._velocity.x;

    const cfg = this._cfg;
    const wheelBase = cfg.cgToFrontAxle + cfg.cgToRearAxle;
    const axleWeightRatioFront = cfg.cgToRearAxle / wheelBase;
    const axleWeightRatioRear = cfg.cgToFrontAxle / wheelBase;

    const axleWeightFront =
      cfg.mass *
      (axleWeightRatioFront * cfg.gravity - (cfg.weightTransfer * this._accelerationC.x * cfg.cgHeight) / wheelBase);

    const axleWeightRear =
      cfg.mass *
      (axleWeightRatioRear * cfg.gravity + (cfg.weightTransfer * this._accelerationC.x * cfg.cgHeight) / wheelBase);

    const yawSpeedFront = cfg.cgToFrontAxle * this._yawRate;
    const yawSpeedRear = -cfg.cgToRearAxle * this._yawRate;

    const slipAngleFront =
      Math.atan2(this._velocityC.y + yawSpeedFront, Math.abs(this._velocityC.x)) -
      this.sign(this._velocityC.x) * this._steerAngle;

    const slipAngleRear = Math.atan2(this._velocityC.y + yawSpeedRear, Math.abs(this._velocityC.x));

    const tireGripFront = cfg.tireGrip;
    const tireGripRear = cfg.tireGrip;

    const frictionForceFront_cy =
      this.clamp(-cfg.cornerStiffnessFront * slipAngleFront, -tireGripFront, tireGripFront) * axleWeightFront;

    const frictionForceRear_cy =
      this.clamp(-cfg.cornerStiffnessRear * slipAngleRear, -tireGripRear, tireGripRear) * axleWeightRear;

    const brake = Math.min(this._brake * cfg.brakeForce, cfg.brakeForce);
    const throttle = this._throttle * cfg.engineForce;

    const tractionForce_cx = throttle - brake * this.sign(this._velocityC.x);
    const tractionForce_cy = 0;

    const dragForce_cx =
      -cfg.rollResist * this._velocityC.x - cfg.airResist * this._velocityC.x * Math.abs(this._velocityC.x);

    const dragForce_cy =
      -cfg.rollResist * this._velocityC.y - cfg.airResist * this._velocityC.y * Math.abs(this._velocityC.y);

    const totalForce_cx = dragForce_cx + tractionForce_cx;
    const totalForce_cy =
      dragForce_cy + tractionForce_cy + Math.cos(this._steerAngle) * frictionForceFront_cy + frictionForceRear_cy;

    this._accelerationC.x = totalForce_cx / cfg.mass;
    this._accelerationC.y = totalForce_cy / cfg.mass;

    this._acceleration.x = cos * this._accelerationC.x - sin * this._accelerationC.y;
    this._acceleration.y = sin * this._accelerationC.x + cos * this._accelerationC.y;

    this._velocity.x += this._acceleration.x * delta;
    this._velocity.y += this._acceleration.y * delta;

    this._absVelocity = this._velocity.length();

    var angularTorque =
      (frictionForceFront_cy + tractionForce_cy) * cfg.cgToFrontAxle - frictionForceRear_cy * cfg.cgToRearAxle;

    //  Sim gets unstable at very slow speeds, so just stop the car
    if (Math.abs(this._absVelocity) < 0.5 && !throttle) {
      this._velocity.x = this._velocity.y = this._absVelocity = 0;
      angularTorque = this._yawRate = 0;
    }

    var angularAccel = angularTorque / this._inertia;

    this._yawRate += angularAccel * delta;
    this._heading += this._yawRate * delta;
    this._speed = (this._velocityC.x * 3600) / 1000; // km/h

    this._position.x += this._velocity.x * delta;
    this._position.y += this._velocity.y * delta;

    let normalizedPos = this._position.x / this._pathLength;
    if (normalizedPos > 1) {
      normalizedPos -= 1;
      this._position.x = normalizedPos * this._pathLength;
    }

    const posOnPath = this._path.getPoint(normalizedPos);

    const t = this._path.getTangent(normalizedPos);
    this._sprite.setPosition(posOnPath.x, posOnPath.y);
    this._sprite.setRotation(t.angle() + Math.PI / 2);

    if (this._cursors.up.isDown) {
      //this._sprite.x += 5;
    }
  }

  private sign(n: number): number {
    return typeof n === 'number' ? (n ? (n < 0 ? -1 : 1) : n === n ? 0 : NaN) : NaN;
  }
  private clamp(n: number, min: number, max: number): number {
    return Math.min(Math.max(n, min), max);
  }
}
