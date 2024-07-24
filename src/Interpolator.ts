
type Setter = (c: number, v: number) => void;
type Getter = () => number;

export class Interpolator {

    private readonly setter: Setter;

    private readonly getter: Getter;

    private vFrom: number = -1;
    private readonly vTo: number;
    private readonly nCycles: number;

    constructor(getter: Getter, setter: Setter, vTo: number, nCycles: number) {
        this.getter = getter;
        this.setter = setter;
        this.vTo = vTo;
        this.nCycles = nCycles;
    }

    private initialize(): void {
        this.vFrom = this.getter();
    }

    interpolate(cycle: number): void {
        if(cycle == this.nCycles - 1) {
            this.setter(cycle, this.vTo);
            return;
        }
        if(cycle === 0)
            this.initialize();
        const interpolated: number = this.vFrom + cycle * (this.vTo - this.vFrom) / (this.nCycles - 1);
        this.setter(cycle, interpolated);
    }
}
