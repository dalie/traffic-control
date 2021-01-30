import Phaser from 'phaser';

interface CarConfig {
  airResist: number;
  brakeForce: number;
  cgHeight: number;
  cgToFront: number;
  cgToFrontAxle: number;
  cgToRear: number;
  cgToRearAxle;
  cornerStiffnessFront: number;
  cornerStiffnessRear: number;
  eBrakeForce: number;
  engineForce: number;
  gravity: number;
  halfWidth: number;
  height: number;
  inertiaScale: number;
  length: number;
  lockGrip: number;
  mass: number;
  maxStreer: number;
  rollResist: number;
  tireGrip: number;
  weightTransfer: number;
  wheelRadius: number;
  wheelWidth: number;
  width: number;
}

export class Car {
  private _accelerationCX = 0;
  private _accelerationCY = 0;
  private _axleWeightRatioFront = 0;
  private _axleWeightRatioRear = 0;
  private _inertia = 0;
  private _wheelBase = 0;
  private _yawRate = 0;

  constructor(private _config: CarConfig, private _sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    this._sprite.body.mass = this._config.mass;
    this._inertia = this._config.mass * this._config.inertiaScale;
    this._wheelBase = this._config.cgToFrontAxle + this._config.cgToRearAxle;
    this._axleWeightRatioFront = this._config.cgToRearAxle / this._wheelBase;
    this._axleWeightRatioRear = this._config.cgToFrontAxle / this._wheelBase;
  }

  update(time: number, delta: number, cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    delta = delta / 1000;
    const throttle = cursors.up ? 1 : 0;
    const brake = cursors.down ? 1 : 0;
    const ebrake = cursors.space ? 1 : 0;
    const steer = ((cursors.left ? -1 : 0) - (cursors.right ? 1 : 0)) * this._config.maxStreer;

    const sin = Math.sin(this._sprite.body.angle);
    const cos = Math.cos(this._sprite.body.angle);

    const velocityCX = cos * this._sprite.body.velocity.x + sin * this._sprite.body.velocity.y;
    const velocityCY = cos * this._sprite.body.velocity.y - sin * this._sprite.body.velocity.x;

    const axleWeightFront =
      this._sprite.body.mass *
      (this._axleWeightRatioFront * this._config.gravity -
        (this._config.weightTransfer * this._accelerationCX * this._config.cgHeight) / this._wheelBase);

    const axleWeightRear =
      this._sprite.body.mass *
      (this._axleWeightRatioRear * this._config.gravity -
        (this._config.weightTransfer * this._accelerationCX * this._config.cgHeight) / this._wheelBase);

    const yawSpeedFront = this._config.cgToFrontAxle * this._yawRate;
    const yawSpeedRear = -this._config.cgToRearAxle * this._yawRate;

    const slipAngleFront = Math.atan2(velocityCY + yawSpeedFront, Math.abs(velocityCX)) - this.sign(velocityCX) * steer;
    const slipAngleRear = Math.atan2(velocityCY + yawSpeedRear, Math.abs(velocityCX));

    const tireGripFront = this._config.tireGrip;
    const tireGripRear = this._config.tireGrip * (1.0 - ebrake * (1.0 - this._config.lockGrip));

    const frictionForceFrontCY =
      this.clamp(-this._config.cornerStiffnessFront * slipAngleFront, -tireGripFront, tireGripFront) * axleWeightFront;

    const frictionForceRearCY =
      this.clamp(-this._config.cornerStiffnessRear * slipAngleRear, -tireGripRear, tireGripRear) * axleWeightRear;

    const brakeForce = Math.min(
      brake * this._config.brakeForce + ebrake * this._config.eBrakeForce,
      this._config.brakeForce
    );

    const throttleForce = throttle * this._config.engineForce;

    const tractionForceCX = throttleForce - brakeForce * this.sign(velocityCX);
    const tractionForceCY = 0;

    const dragForceCX =
      -this._config.rollResist * velocityCX - this._config.airResist * velocityCX * Math.abs(velocityCX);
    const dragForceCY =
      -this._config.rollResist * velocityCY - this._config.airResist * velocityCY * Math.abs(velocityCY);

    const totalForceCX = dragForceCX + tractionForceCX;
    const totalForceCY = dragForceCY + tractionForceCY + Math.cos(steer) * frictionForceFrontCY + frictionForceRearCY;

    this._accelerationCX = totalForceCX / this._config.mass;
    this._accelerationCY = totalForceCY / this._config.mass;

    this._sprite.body.acceleration.x = cos * this._accelerationCX - sin * this._accelerationCY;
    this._sprite.body.acceleration.y = sin * this._accelerationCX + cos * this._accelerationCY;

    this._sprite.body.velocity.x += this._accelerationCX * delta;
    this._sprite.body.velocity.y += this._accelerationCY * delta;

    const absVelocity = Math.abs(this._sprite.body.velocity.length());
    let angularTorque =
      (frictionForceFrontCY + tractionForceCY) * this._config.cgToFrontAxle -
      frictionForceRearCY * this._config.cgToRearAxle;

    if (absVelocity < 0.5 && throttle == 0) {
      this._sprite.body.velocity.set(0, 0);
      this._yawRate = 0;
      angularTorque = 0;
    }

    const angularAcceleration = angularTorque / this._inertia;
    this._yawRate += angularAcceleration * delta;
    this._sprite.body.angle += this._yawRate * delta;

    this._sprite.body.position.x += this._sprite.body.velocity.x + delta;
    this._sprite.body.position.y += this._sprite.body.velocity.y + delta;
  }

  private clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }

  private sign(n) {
    //  Allegedly fastest if we check for number type
    return typeof n === 'number' ? (n ? (n < 0 ? -1 : 1) : n === n ? 0 : NaN) : NaN;
  }
}
