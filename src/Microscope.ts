export class LED {
    readonly WAVELENGTH: number;

    static readonly LED_385: LED = new LED(385);
    static readonly LED_470: LED = new LED(470);
    static readonly LED_567: LED = new LED(567);
    static readonly LED_625: LED = new LED(625);
    
    private constructor(wavelength: number) {
        this.WAVELENGTH = wavelength;
    }
}

export const LEDs: LED[] = [
    LED.LED_385,
    LED.LED_470,
    LED.LED_567,
    LED.LED_625
];

export class LEDSetting {
    readonly led: LED;
    private intensity: number;

    constructor(led: LED, intensity: number) {
        this.led = led;
        this.intensity = intensity;
    }

    setIntensity(intensity: number): void {
        this.intensity = intensity;
    }

    getIntensity(): number {
        return this.intensity;
    }
}

export class Channel {
    readonly name: string;
    private readonly ledSettings: LEDSetting[];
    private exposureTime: number;

    constructor(name: string, first: LEDSetting, remaining: LEDSetting[], exposureTime: number) {
        this.name = name;
        this.ledSettings = [first];
        this.ledSettings.push(...remaining);
        this.exposureTime = exposureTime;
    }

    getLEDSetting(led: LED): LEDSetting | undefined {
        return this.ledSettings.find((value: LEDSetting) => value.led.WAVELENGTH === led.WAVELENGTH)
    }

    getExposureTime(): number {
        return this.exposureTime;
    }

    setExposureTime(exposureTime: number): void {
        this.exposureTime = exposureTime;
    }
}

export class Lens {
    readonly magnification: number;
    readonly label: string;

    static readonly FIVE: Lens = new Lens(5, "5x");
    static readonly TWENTY: Lens = new Lens(20, "20x");

    private constructor(magnification: number, label: string) {
        this.magnification = magnification;
        this.label = label;
    }

    toString(): string {
        return this.label;
    }
}

export const LENSES: Lens[] = [
    Lens.FIVE,
    Lens.TWENTY
];

export class MagnificationChanger {
    readonly magnification: number;
    readonly label: string;

    static readonly ZERO_FIVE: MagnificationChanger = new MagnificationChanger(0.5, "0.5x");
    static readonly ONE_ZERO:  MagnificationChanger = new MagnificationChanger(1.0, "1.0x");
    static readonly TWO_ZERO:  MagnificationChanger = new MagnificationChanger(2.0, "2.0x");

    private constructor(magnification: number, label: string) {
        this.magnification = magnification;
        this.label = label;
    }

    toString(): string {
        return this.label;
    }
}

export const MAGNIFICATION_CHANGES = [
    MagnificationChanger.ZERO_FIVE,
    MagnificationChanger.ONE_ZERO,
    MagnificationChanger.TWO_ZERO
]

export class Binning {
    readonly binning: number;
    readonly label: string;

    static readonly ONE:   Binning = new Binning(1, "1x1");
    static readonly TWO:   Binning = new Binning(2, "2x2");
    static readonly THREE: Binning = new Binning(3, "3x3");
    static readonly FOUR:  Binning = new Binning(4, "4x4");
    static readonly FIVE:  Binning = new Binning(5, "5x5");

    private constructor(binning: number, label: string) {
        this.binning = binning;
        this.label = label;
    }

    toString(): string {
        return this.label;
    }
}

export class Tuple3D {
    readonly x: number;
    readonly y: number;
    readonly z: number;

    constructor(t: number[]) {
        this.x = t[0];
        this.y = t[1];
        this.z = t[2];
    }

    toString() : string {
        return "(" + this.x + ", " + this.y + ", " + this.z + ")";
    }
}

export class Position {
    readonly name: string;
    readonly center: Tuple3D;
    readonly extent: Tuple3D;

    constructor(name: string, center: number[], extent: number[]) {
        this.name = name;
        this.center = new Tuple3D(center);
        this.extent = new Tuple3D(extent);
    }

    toString(): string {
        return this.name + " " + this.center.toString();
    }
}

class Incubation {
    temperature: number = 20;
    co2Concentration: number = 0;

    setTemperature(temperature: number): void {
        this.temperature = temperature;
    }

    setCO2Concentration(co2Concentration: number): void {
        this.co2Concentration = co2Concentration;
    }

    reset(): void {
        this.temperature = 20;
        this.co2Concentration = 0;
    }
}

export const ALL_CHANNELS: string = "ALL_CHANNELS";
export const ALL_POSITIONS: string = "ALL_POSITIONS";


export class Microscope {
    private readonly channels: Channel[] = [];
    private readonly positions: Position[] = [];

    private lens: Lens = Lens.FIVE;
    private magnificationChanger: MagnificationChanger = MagnificationChanger.ONE_ZERO;
    private binning: Binning = Binning.ONE;
    private readonly incubation = new Incubation();

    onAcquire: (position: Position, channel: Channel) => void = this.acquireSinglePositionAndChannel;

    reset(): void {
        this.channels.length = 0;
        this.positions.length = 0;
        this.lens = Lens.FIVE;
        this.magnificationChanger = MagnificationChanger.ONE_ZERO;
        this.binning = Binning.ONE;
        this.incubation.reset();
    }

    setOnAcquire(func: (position: Position, channel: Channel) => void) {
        this.onAcquire = func;
    }

    addChannel(channel: Channel): void {
        this.channels.push(channel);
    }

    getChannel(name: string): Channel | undefined {
        return this.channels.find((value: Channel) => value.name === name);
    }

    clearChannels(): void {
        this.channels.length = 0;
    }

    addPosition(position: Position): void {
        this.positions.push(position);
    }

    getPosition(name: string): Position | undefined {
        return this.positions.find((value: Position) => value.name === name);
    }

    clearPositions(): void {
        this.positions.length = 0;
    }

    getTemperature(): number {
        return this.incubation.temperature;
    }

    setTemperature(temperature: number): void {
        this.incubation.setTemperature(temperature);
    }

    getCO2Concentration(): number {
        return this.incubation.co2Concentration;
    }

    setCO2Concentration(co2Concentration: number): void {
        this.incubation.setCO2Concentration(co2Concentration);
    }

    getLens(): Lens {
        return this.lens;
    }

    setLens(lens: Lens): void {
        this.lens = lens;
    }

    getMagnificationChanger(): MagnificationChanger {
        return this.magnificationChanger;
    }

    setMagnificationChanger(mag: MagnificationChanger): void {
        this.magnificationChanger = mag;
    }

    setBinning(binning: Binning): void {
        this.binning = binning;
    }

    acquire(positionNames: string[], channelNames: string[], dz: number): void {
        const channels: Channel[] = channelNames.length > 0 && channelNames[0] === ALL_CHANNELS
            ? this.channels
            : channelNames.map((value: string) => this.getChannel(value)) as Channel[];
    
        const positions: Position[] = positionNames.length > 0 && positionNames[0] === ALL_POSITIONS
            ? this.positions
            : positionNames.map((value) => this.getPosition(value)) as Position[];
    
        this.acquirePositionsAndChannels(positions, channels, dz);
    }

    acquirePositionsAndChannels(positions: Position[], channels: Channel[], _dz: number) {
        for(const position of positions) {
            for(const channel of channels) {
                this.onAcquire(position, channel);
            }
        }
    }

    acquireSinglePositionAndChannel(position: Position, channel: Channel) {
        const timeStamp = new Date().toLocaleString('en-us', {year: 'numeric', month: 'short', day: 'numeric', hour12:false, hour:'numeric', minute:'numeric', second:'numeric'});
        console.log(timeStamp);
        console.log("======================");
        console.log("Stage position: " + position.name);
        console.log("  - " + position.center.toString());
        console.log();
        console.log("Channel settings: " + channel.name);
        console.log("  - Exposure time: " + channel.getExposureTime() + "ms");
        for(const led of LEDs) {
            const ledSetting: LEDSetting | undefined= channel.getLEDSetting(led);
            if(ledSetting !== undefined)
                console.log("  - LED " + led.WAVELENGTH + ": " + ledSetting.getIntensity() + "%");
        }
        console.log();
        console.log("Optics:");
        console.log("  - Lens: " + this.lens);
        console.log("  - Mag.Changer: " + this.magnificationChanger);
        console.log("  - Binning: " + this.binning);
        console.log();
        console.log("Incubation:");
        console.log("  - Temperature: " + this.getTemperature() + "C");
        console.log("  - CO2 concentration: " + this.getCO2Concentration() + "%");
        console.log();    
        console.log("Acquire stack");
        console.log();
        console.log();
    }
}