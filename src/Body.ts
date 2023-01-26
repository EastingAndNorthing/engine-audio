
export class Body {

    radius: number = 0.250;

    theta: number = 0;
    omega: number = 0;
    prevTheta: number = 0;
    prevOmega: number = 0;

    mass: number = 1;
    inertia: number;
    invInertia: number;
    invMass: number;

    torque: number = 0.0;

    constructor() {
        this.setMass(1);
    }

    setMass(mass: number) {
        this.mass = mass;
        this.inertia = 0.5 * this.mass * Math.pow(this.radius, 2);
        this.invInertia = 1 / this.inertia;
        this.invMass = 1 / this.mass

        return this;
    }

    // setInertia(mass: number) {
    //     this.inertia = 0.5 * this.mass * Math.pow(this.radius, 2);
    //     this.invInertia = 1 / this.inertia;
    //     this.invMass = 1 / this.mass
    // }

    applyTorque(torque: number) {
        this.torque += torque;
    }

    integrate(h: number) {
        this.prevTheta = this.theta;

        this.omega += this.torque * this.invInertia * h;

        this.theta += this.omega * h;
    }

    update(h: number) {
        this.prevOmega = this.omega;

        const dTheta = (this.theta - this.prevTheta) / h;

        this.omega = dTheta;
    }

    // solvePos(corr: number, h: number, compliance = 0.01) {
    //     const c = this.getCorrection(corr, h, compliance);
    //     this.theta += c * Math.sign(corr);
    // }

    // solveVel(vrel: number, h: number) {
    //     // let dv = 0;
    //     // dv -= engine.omega;
    //     // dv += this.omega;
    //     // dv *= Math.min(1.0, 1 * h);

    //     // this.omega += this.getCorrection(dv, h, 0.01);

    //     this.omega += vrel * this.damping * h;
    // }

    // getCorrection(corr: number, h: number, compliance = 0) {

    //     const w = corr * corr * 1/this.inertia; // idk?

    //     const dlambda = -corr / (w + compliance / h / h);
        
    //     return corr * -dlambda;
    // }

    public getInverseMass(): number {

        let n = this.radius;
        let w = n * n * this.invInertia;
        // w += this.invMass;

        return w;
    }

    public applyCorrection(corr: number, velocityLevel = false): void {

        // let dq = this.radius;
        // // dq.cross(corr); // ??
        // dq *= this.invInertia;

        if (velocityLevel)
            this.omega += corr;
        else
            this.applyRotation(corr);

    }

    public applyRotation(rot: number, scale: number = 1.0): void {

        // Safety clamping. This happens very rarely if the solver
        // wants to turn the body by more than 30 degrees in the
        // orders of milliseconds
        let maxPhi = 0.5;
        let phi = rot;
        if (phi * scale > maxPhi)
            scale = maxPhi / phi;

        let dq = rot * scale;

        // this.theta = this.theta + 0.5 * dq; // ??
        this.theta += dq;
    }
}