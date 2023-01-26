import { AudioManager, AudioSource } from "./AudioManager";
import { Engine } from "./Engine";
import { Transmission as Transmission } from "./Transmission";
import { clamp } from "./util/clamp";
import { Body } from "./Body";
import { Constraint } from "./Constraint";
import { BodyLinear } from "./BodyLinear";


// https://www.motormatchup.com/catalog/BAC/Mono/2020/Base
export class Vehicle {

    audio = new AudioManager();

    body = new BodyLinear().setMass(1000);
    engine = new Engine();
    transmission = new Transmission();
    wheel = new Body();

    bodies: Array<Body|BodyLinear> = [];
    constraints: Constraint[] = [];

    mass = 1000;

    velocity = 0;
    wheel_rpm = 0;
    wheel_omega = 0;

    constructor() {
        this.bodies.push(this.body);
        this.bodies.push(this.engine);
        this.bodies.push(this.wheel);
        this.wheel.radius = 0.250;
        this.wheel.setMass(4 * (12.0 + 2));

        this.constraints.push(
            new Constraint(this.engine, this.wheel)
        );
    }

    async init(soundBank: Record<string, AudioSource>) {

        if (this.audio)
            this.audio.dispose();

        this.audio = new AudioManager();
        
        await this.audio.init({
            ...soundBank,

            tranny_on: {
                source: 'audio/trany_power_high.wav',
                rpm: 0,
                volume: 0.4
            },
            tranny_off: {
                source: 'audio/tw_offlow_4 {0da7d8b9-9064-4108-998b-801699d71790}.wav',
                // source: 'audio/tw_offhigh_4 {92e2f69f-c149-4fb0-a2b1-c6ee6cbb56a4}.wav',
                rpm: 0,
                volume: 0.2
            },
        })
    }

    // http://www.thecartech.com/subjects/auto_eng/car_performance_formulas.htm
    // https://pressbooks-dev.oer.hawaii.edu/collegephysics/chapter/10-3-dynamics-of-rotational-motion-rotational-inertia/
    update(time: number, dt: number) {

        const I = this.getLoadInertia() * 2;

        if (this.transmission.gear > 0) {
            // this.constraints[0].setCompliance(0.01);
            this.constraints[0]
                .setCompliance(0.004 - 0.002 * Math.pow(this.transmission.gear, 0.25))
                .setDamping(80);
        } else {
            this.constraints[0].setCompliance(999999);
        }
        
        /* Simulation loop */
        const subSteps = 10;
        const h = dt / subSteps;

        for (let i = 0; i < subSteps; i++) {

            const torque = this.engine.letsgo(time, h);
            this.engine.setTorque(torque);
            this.engine.setLoad(I);

            // Don't use force -- should be position based
            // this.body.setForce(
            //     // 1.0 * Math.pow(this.velocity, 2)
            //     (torque * this.transmission.getTotalGearRatio()) / this.wheel.radius
            // );

            for (const body of this.bodies)
                body.integrate(h);

            for (const constraint of this.constraints)
                constraint.solvePos(h, 1);
                // constraint.solvePos(h, this.transmission.getTotalGearRatio());
            
            for (const body of this.bodies)
                body.update(h);

            for (const constraint of this.constraints)
                constraint.solveVel(h);

            this.solveVelocities(h);

            this.engine.updateRPM();
        }

        if (this.audio.ctx)
            this.engine.applySounds(this.audio.samples, this.transmission.gear);
    }

    private solveVelocities(h: number) {
        if (this.transmission.gear > 0) {
            const v_wheel = this.wheel.omega * this.wheel.radius;
            this.body.velocity = v_wheel;
            // this.body.velocity *= 0.999;

            // const v_wheel_new = this.body.velocity / this.wheel.radius;
            // this.wheel.omega = v_wheel_new;

            /* km/h */
            this.velocity = this.body.velocity * 3.6;

            // const corr = v_wheel - v;
            // this.body.applyCorrection(corr, true);
        }
    }

    private getLoadInertia() {
        if (this.transmission.gear == 0)
            return 0;
            
        const gearRatio = this.transmission.getGearRatio();
        const totalGearRatio = this.transmission.getTotalGearRatio();

        /* Moment of inertia - I = mr^2 */
        const I_veh = this.mass * Math.pow(this.wheel.radius, 2);
        const I_wheels = this.wheel.inertia; // 4 * 12.0 * Math.pow(this.wheel_radius, 2);

        /* Adjust inertia for gear ratio */
        const I1 = I_veh / Math.pow(totalGearRatio, 2); 
        const I2 = I_wheels / Math.pow(totalGearRatio, 2); 
        const I = I1 + I2;

        return I;
    }


    changeGear(gear: number) {

        const prevRatio = this.transmission.getGearRatio(this.transmission.gear);
        const nextRatio = this.transmission.getGearRatio(gear);
        const ratioRatio = prevRatio > 0 ? nextRatio / prevRatio : 0;

        if (ratioRatio === 1)
            return;

        /* Neutral */
        this.transmission.gear = 0;
        this.constraints[0].setBaseTheta();

        /* Engage next gear */
        setTimeout(() => {
            // this.constraints[0].setBaseTheta();
            this.engine.omega = this.engine.omega * ratioRatio;
            
            this.transmission.gear = gear;
            this.transmission.gear = clamp(gear, 0, this.transmission.gears.length);
            
            // this.constraints[0]
            //     .setDamping(100 - gear * 10);

            console.log('Changed', this.transmission.gear, this.transmission.getTotalGearRatio());
        }, this.transmission.shiftTime)
    }

    nextGear() {
        this.changeGear(this.transmission.gear + 1);
    }

    prevGear() {
        this.changeGear(this.transmission.gear - 1);
    }

}
