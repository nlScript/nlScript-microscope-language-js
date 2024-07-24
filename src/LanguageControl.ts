import { Parser } from "@nlscript/nlScript-js";
import { Autocompletion } from '@nlscript/nlScript-js';
import { IfNothingYetEnteredAutocompleter } from '@nlscript/nlScript-js';
import { ALL_CHANNELS, ALL_POSITIONS, Binning, Channel, LED, LEDSetting, LEDs, Lens, MagnificationChanger, Microscope, Position } from './Microscope.js';
import { Timeline } from './Timeline.js';
import { Interpolator } from './Interpolator.js';


export class LanguageControl {
    private readonly microscope: Microscope;

    private timeline: Timeline<() => void> = new Timeline();

    private globalStart: Date = new Date();

    constructor(microscope: Microscope | undefined = undefined) {
        this.microscope = microscope !== undefined ? microscope : new Microscope();
    }

    reset(): void {
        this.globalStart = new Date();
        this.timeline.clear();
        this.microscope.reset();
    }

    getTimeline(): Timeline<() => void> {
        return this.timeline;
    }

    getMicroscope(): Microscope {
        return this.microscope;
    }

    initParser(): Parser {

        const definedChannels: string[] = [];
        const definedRegions: string[] = [];

        let parser = new Parser();
        parser.addParseStartListener(() => {
            definedChannels.length = 0;
            definedRegions.length = 0;
        });


        parser.defineType("led", "385nm", _e => LED.LED_385);
        parser.defineType("led", "470nm", _e => LED.LED_470);
        parser.defineType("led", "567nm", _e => LED.LED_567);
        parser.defineType("led", "625nm", _e => LED.LED_625);

        parser.defineType("led-power", "{<led-power>:int}%",
                          e => e.evaluate("<led-power>"),
                          true);

        parser.defineType("exposure-time", "{<exposure-time>:int}ms",
                          e => e.evaluate("<exposure-time>"),
                          true);

        parser.defineType("led-setting", "{led-power:led-power} at {wavelength:led}",
                          e => {
                              const power = e.evaluate("led-power");
                              const led = e.evaluate("wavelength");
                              return new LEDSetting(led, power);
                          },
                          true);

        parser.defineType("another-led-setting", ", {led-setting:led-setting}",
                          e => e.evaluate("led-setting"),
                          true);

        parser.defineType("channel-name", "'{<name>:[A-Za-z0-9]:+}'",
                          e => e.getParsedString("<name>"),
                          true);

        parser.defineSentence(
            "Define channel {channel-name:channel-name}:" +
            "{\n  }excite with {led-setting:led-setting}{another-led-setting:another-led-setting:0-3}" +
            "{\n  }use an exposure time of {exposure-time:exposure-time}.",
            e => {
                const name: string = e.evaluate("channel-name");
                const firstLedSetting: LEDSetting = e.evaluate("led-setting");
                const otherLedSettings: LEDSetting[] = e.evaluate("another-led-setting");
                const exposureTime: number = e.evaluate("exposure-time");
                const channel: Channel = new Channel(name, firstLedSetting, otherLedSettings, exposureTime);
                this.microscope.addChannel(channel);
                return undefined;
            }
        ).onSuccessfulParsed(n => {
            definedChannels.push(n.getParsedString("channel-name"));
        });

        parser.defineType("region-name", "'{<region-name>:[a-zA-Z0-9]:+}'",
                          e => e.getParsedString("<region-name>"),
                          true);

        parser.defineType("region-dimensions", "{<width>:float} x {<height>:float} x {<depth>:float} microns",
                          e => {
                              const w: number = e.evaluate("<width>");
                              const h: number = e.evaluate("<height>");
                              const d: number = e.evaluate("<depth>");
                              return [w, h, d];
                          },
                          true);

        parser.defineType("region-center", "{<center>:tuple<float,x,y,z>} microns",
                          e => e.evaluate("<center>"),
                          true);
        
        parser.defineSentence(
            "Define a position {region-name:region-name}:" +
            "{\n  }{region-dimensions:region-dimensions}" +
            "{\n  }centered at {region-center:region-center}.",
            e => {
                const name: string = e.evaluate("region-name");
                const dimensions: number[] = e.evaluate("region-dimensions");
                const center: number[] = e.evaluate("region-center");
                this.microscope.addPosition(new Position(name, center, dimensions));
                return undefined;
            }
        ).onSuccessfulParsed(n => {
            definedRegions.push(n.getParsedString("region-name"));
        });

        parser.defineType("defined-channels", "'{channel:[A-Za-z0-9]:+}'",
                          e => e.getParsedString("channel"),
                          e => Autocompletion.literal(e, definedChannels));

        parser.defineType("defined-positions", "'{position:[A-Za-z0-9]:+}'",
                          e => e.getParsedString("position"),
                          e => Autocompletion.literal(e, definedRegions));

        parser.defineType("time-unit", "second(s)", _e => 1);
        parser.defineType("time-unit", "minute(s)", _e => 60);
        parser.defineType("time-unit", "hour(s)",   _e => 3600);

        parser.defineType("time-interval", "{n:float} {time-unit:time-unit}",
                          e => {
                              const nUnits: number = e.evaluate("n");
                              const unitInSeconds: number = e.evaluate("time-unit");
                              return Math.round(nUnits * unitInSeconds);
                          },
                          true);

        parser.defineType("repetition", "once", _e =>  [1, 0]);
        parser.defineType("repetition", "every {interval:time-interval} for {duration:time-interval}",
                          e => {
                              const interval: number = e.evaluate("interval");
                              const duration: number = e.evaluate("duration");
                              return [ interval, duration ];
                          },
                          true);

        parser.defineType("z-distance", "{z-distance:float} microns",
                          e => e.evaluate("z-distance"),
                          true);

        parser.defineType("lens",  "5x lens", _e => Lens.FIVE);
        parser.defineType("lens", "20x lens", _e => Lens.TWENTY);

        parser.defineType("mag", "0.5x magnification changer", _e => MagnificationChanger.ZERO_FIVE);
        parser.defineType("mag", "1.0x magnification changer", _e => MagnificationChanger.ONE_ZERO);
        parser.defineType("mag", "2.0x magnification changer", _e => MagnificationChanger.TWO_ZERO);

        parser.defineType("binning", "1 x 1", _e => Binning.ONE);
        parser.defineType("binning", "2 x 2", _e => Binning.TWO);
        parser.defineType("binning", "3 x 3", _e => Binning.THREE);
        parser.defineType("binning", "4 x 4", _e => Binning.FOUR);
        parser.defineType("binning", "5 x 5", _e => Binning.FIVE);

        parser.defineType("start", "At the beginning", _e => this.globalStart);
        parser.defineType("start", "At {time:time}",    e => e.evaluate("time"), true);
        parser.defineType("start", "After {delay:time-interval}",
                          e => {
                              const afterSeconds: number = e.evaluate("delay");
                              const d: Date = new Date(this.globalStart);
                              d.setSeconds(d.getSeconds() + afterSeconds);
                              return d;
                          },
                          true);

        parser.defineType("position-list", "all positions", _e => [ ALL_POSITIONS ]);
        parser.defineType("position-list", "position(s) {positions:list<defined-positions>}", e => e.evaluate("positions"));
        
        parser.defineType("channel-list", "all channels", _e => [ ALL_CHANNELS ]);
        parser.defineType("channel-list", "channel(s) {channels:list<defined-channels>}", e => e.evaluate("channels"));

        parser.defineSentence(
            "{start:start}{, }acquire..." +
            "{\n  }{repetition:repetition}" +
            "{\n  }{position-list:position-list}" +
            "{\n  }{channel-list:channel-list}" +
            "{\n  }with a plane distance of {dz:z-distance}" +
            "{\n  }using the {lens:lens} with the {magnification:mag} and a binning of {binning:binning}.",
            e => {
                const time: Date = e.evaluate("start");
                const repetition: number[] = e.evaluate("repetition");
                const interval: number = repetition[0];
                const duration: number = repetition[1];

                const positionNames: string[] = e.evaluate("position-list");
                const channelNames: string[] = e.evaluate("channel-list");
                const lens: Lens = e.evaluate("lens");
                const mag: MagnificationChanger = e.evaluate("magnification");
                const binning: Binning = e.evaluate("binning");
                const dz: number = e.evaluate("dz");

                const start: Date = new Date();
                start.setHours(time.getHours());
                start.setMinutes(time.getMinutes());
                start.setSeconds(time.getSeconds());
                start.setMilliseconds(time.getMilliseconds());

                if(this.globalStart.getTime() > start.getTime())
                    start.setDate(start.getDate() + 1); // add one day
                
                const nCycles: number = duration < interval ? 1 : Math.floor(duration / interval) + 1;
                for(let c = 0; c < nCycles; c++) {
                    const plannedExecutionTime: Date = new Date(start);
                    plannedExecutionTime.setSeconds(start.getSeconds() + (c * interval));
                    this.timeline.put(plannedExecutionTime, () => {
                        this.microscope.setLens(lens);
                        this.microscope.setMagnificationChanger(mag);
                        this.microscope.setBinning(binning);
                        this.microscope.acquire(positionNames, channelNames, dz);
                    });
                }
                return undefined;
            });
        
        parser.defineSentence(
            "{start:start}{, }adjust..." +
            "{\n  }{repetition:repetition}" +
            "{\n  }the power of the {led:led} led of channel {channel:defined-channels} to {power:led-power}.",
            e => {
                const time: Date = e.evaluate("start");
                const repetition: number[] = e.evaluate("repetition");
                const interval: number = repetition[0];
                const duration: number = repetition[1];

                const led: LED = e.evaluate("led");
                const channel: string = e.evaluate("channel");
                const power: number = e.evaluate("power");

                const start: Date = new Date();
                start.setHours(time.getHours());
                start.setMinutes(time.getMinutes());
                start.setSeconds(time.getSeconds());
                start.setMilliseconds(time.getMilliseconds());

                if(this.globalStart.getTime() > start.getTime())
                    start.setDate(start.getDate() + 1); // add one day
                
                const nCycles: number = duration < interval ? 1 : Math.floor(duration / interval) + 1;
		console.log("globalStart");
		console.log(this.globalStart);

                const interpolator: Interpolator = new Interpolator(
                    () => this.microscope.getChannel(channel)?.getLEDSetting(led)?.getIntensity() as number,
                    (_c, v) => this.microscope.getChannel(channel)?.getLEDSetting(led)?.setIntensity(Math.round(v)),
                    power, nCycles);

                for(let c = 0; c < nCycles; c++) {
                    const cycle = c;
                    const plannedExecutionTime: Date = new Date(start);
                    plannedExecutionTime.setSeconds(start.getSeconds() + (c * interval));
		    console.log(plannedExecutionTime);
                    this.timeline.put(plannedExecutionTime, () => interpolator.interpolate(cycle));
                }

                return undefined;
            });

        parser.defineSentence(
            "{start:start}{, }adjust..." +
            "{\n  }{repetition:repetition}" +
            "{\n  }the exposure time of channel {channel:defined-channels} to {exposure-time:exposure-time}.",
            e => {
                const time: Date = e.evaluate("start");
                const repetition: number[] = e.evaluate("repetition");
                const interval: number = repetition[0];
                const duration: number = repetition[1];

                const channel: string = e.evaluate("channel");
                const exposureTime: number = e.evaluate("exposure-time");

                const start: Date = new Date();
                start.setHours(time.getHours());
                start.setMinutes(time.getMinutes());
                start.setSeconds(time.getSeconds());
                start.setMilliseconds(time.getMilliseconds());

                if(this.globalStart.getTime() > start.getTime())
                    start.setDate(start.getDate() + 1); // add one day
                
                const nCycles: number = duration < interval ? 1 : Math.floor(duration / interval) + 1;

                const interpolator: Interpolator = new Interpolator(
                    () => this.microscope.getChannel(channel)?.getExposureTime() as number,
                    (_c, v) => this.microscope.getChannel(channel)?.setExposureTime(Math.round(v)),
                    exposureTime, nCycles);

                for(let c = 0; c < nCycles; c++) {
                    const cycle = c;
                    const plannedExecutionTime: Date = new Date(start);
                    plannedExecutionTime.setSeconds(start.getSeconds() + (c * interval));
                    this.timeline.put(plannedExecutionTime, () => interpolator.interpolate(cycle));
                }
                return undefined;
            });

        parser.defineType("temperature", "{temperature:float}\u00B0C", e => e.evaluate("temperature"), true);
        
        parser.defineType("co2-concentration", "{CO2 concentration:float}%", e => e.evaluate("CO2 concentration"), true);

        parser.defineSentence(
            "{start:start}{, }adjust..." +
            "{\n  }{repetition:repetition}" +
            "{\n  }the CO2 concentration to {co2-concentration:co2-concentration}.",
            e => {
                const time: Date = e.evaluate("start");
                const repetition: number[] = e.evaluate("repetition");
                const interval: number = repetition[0];
                const duration: number = repetition[1];

                const co2Concentration: number = e.evaluate("co2-concentration");

                const start: Date = new Date();
                start.setHours(time.getHours());
                start.setMinutes(time.getMinutes());
                start.setSeconds(time.getSeconds());
                start.setMilliseconds(time.getMilliseconds());

                if(this.globalStart.getTime() > start.getTime())
                    start.setDate(start.getDate() + 1); // add one day
                
                const nCycles: number = duration < interval ? 1 : Math.floor(duration / interval) + 1;

                const interpolator: Interpolator = new Interpolator(
                    () => this.microscope.getCO2Concentration(),
                    (_c, v) => this.microscope.setCO2Concentration(v),
                    co2Concentration, nCycles);

                for(let c = 0; c < nCycles; c++) {
                    const cycle = c;
                    const plannedExecutionTime: Date = new Date(start);
                    plannedExecutionTime.setSeconds(start.getSeconds() + (c * interval));
                    this.timeline.put(plannedExecutionTime, () => interpolator.interpolate(cycle));
                }
                return undefined;
            });
        
        parser.defineSentence(
            "{start:start}{, }adjust..." +
            "{\n  }{repetition:repetition}" +
            "{\n  }the temperature to {temperature:temperature}.",
            e => {
                const time: Date = e.evaluate("start");
                const repetition: number[] = e.evaluate("repetition");
                const interval: number = repetition[0];
                const duration: number = repetition[1];

                const temperature: number = e.evaluate("temperature");

                const start: Date = new Date();
                start.setHours(time.getHours());
                start.setMinutes(time.getMinutes());
                start.setSeconds(time.getSeconds());
                start.setMilliseconds(time.getMilliseconds());

                if(this.globalStart.getTime() > start.getTime())
                    start.setDate(start.getDate() + 1); // add one day
                
                const nCycles: number = duration < interval ? 1 : Math.floor(duration / interval) + 1;

                const interpolator: Interpolator = new Interpolator(
                    () => this.microscope.getTemperature(),
                    (_c, v) => this.microscope.setTemperature(v),
                    temperature, nCycles);

                for(let c = 0; c < nCycles; c++) {
                    const cycle = c;
                    const plannedExecutionTime: Date = new Date(start);
                    plannedExecutionTime.setSeconds(start.getSeconds() + (c * interval));
                    this.timeline.put(plannedExecutionTime, () => interpolator.interpolate(cycle));
                }
                return undefined;
            });
       
        return parser;
    }
}


export function makeMicroscopeParser(): Parser {

    let parser = new Parser();

    const definedChannels: string[] = [];
    const definedRegions: string[] = [];

    parser.addParseStartListener(() => {
        definedChannels.length = 0;
        definedRegions.length = 0;
    });


    parser.defineType("led", "385nm", _e => 385);
    parser.defineType("led", "470nm", _e => 470);
    parser.defineType("led", "567nm", _e => 567);
    parser.defineType("led", "625nm", _e => 625);

    parser.defineType("led-power", "{<led-power>:int}%", e => e.evaluate("<led-power>"), true);

    parser.defineType("exposure-time", "{<exposure-time>:int}ms", e => e.evaluate("<exposure-time>"), true);

    parser.defineType("led-setting", "{led-power:led-power} at {wavelength:led}", e => {
        const power = e.evaluate("led-power");
        const led = e.evaluate("wavelength");
        return { led: led, power: power };
    }, true);

    parser.defineType("another-led-setting", ", {led-setting:led-setting}", e => e.evaluate("led-setting"), true);

    parser.defineType("channel-name", "'{<name>:[A-Za-z0-9]:+}'", e => e.getParsedString("<name>"), true);

    parser.defineSentence(
        "Define channel {channel-name:channel-name}:" +
        "{\n  }excite with {led-setting:led-setting}{another-led-setting:another-led-setting:0-3}" +
        "{\n  }use an exposure time of {exposure-time:exposure-time}.",
        undefined
    ).onSuccessfulParsed(n => {
        definedChannels.push(n.getParsedString("channel-name"));
    });



    parser.defineType("region-name", "'{<region-name>:[a-zA-Z0-9]:+}'", undefined, true);

    parser.defineType("region-dimensions", "{<width>:float} x {<height>:float} x {<depth>:float} microns", undefined, true);
    parser.defineType("region-center", "{<center>:tuple<float,x,y,z>} microns", undefined, true);
    parser.defineType("sentence",
            "Define a position {region-name:region-name}:" +
            "{\n  }{region-dimensions:region-dimensions}" +
            "{\n  }centered at {region-center:region-center}.",
            undefined
    ).onSuccessfulParsed(n => {
        definedRegions.push(n.getParsedString("region-name"));
    });

    parser.defineType("defined-channels", "'{channel:[A-Za-z0-9]:+}'",
            _e => undefined,
            e => Autocompletion.literal(e, definedChannels));

    parser.defineType("defined-positions", "'{position:[A-Za-z0-9]:+}'",
            e => e.getParsedString("position"),
            e => Autocompletion.literal(e, definedRegions));

    parser.defineType("time-unit", "second(s)", _e => 1);
    parser.defineType("time-unit", "minute(s)", _e => 60);
    parser.defineType("time-unit", "hour(s)",   _e => 3600);

    parser.defineType("time-interval", "{n:float} {time-unit:time-unit}", e => {
        const n: number = e.evaluate("n");
        const unit: number = e.evaluate("time-unit");
        const seconds: number = Math.round(n * unit);
        return seconds;
    }, true);

    parser.defineType("repetition", "once", _e =>  [1, 0]);

    parser.defineType("repetition", "every {interval:time-interval} for {duration:time-interval}", e => {
        const interval: number = e.evaluate("interval");
        const duration: number = e.evaluate("duration");
        return [ interval, duration ];
    }, true);

    parser.defineType("z-distance", "{z-distance:float} microns", undefined, true);

    parser.defineType("lens",  "5x lens", undefined);
    parser.defineType("lens", "20x lens", undefined);

    parser.defineType("mag", "0.5x magnification changer", undefined);
    parser.defineType("mag", "1.0x magnification changer", undefined);
    parser.defineType("mag", "2.0x magnification changer", undefined);

    parser.defineType("binning", "1 x 1", _e => 1);
    parser.defineType("binning", "2 x 2", _e => 2);
    parser.defineType("binning", "4 x 4", _e => 4);
    parser.defineType("binning", "8 x 8", _e => 8);

    parser.defineType("temperature", "{temperature:float}\u00B0C", undefined, true);
    parser.defineType("co2-concentration", "{CO2 concentration:float}%", undefined, true);

    parser.defineType("incubation",
            "set the temperature to {temperature:temperature}",
            undefined);

    parser.defineType("incubation",
            "set the CO2 concentration to {co2-concentration:co2-concentration}",
            undefined);

    parser.defineType("acquisition",
            "acquire..." +
                    "{\n  }every {interval:time-interval} for {duration:time-interval}" +
                    "{\n  }position(s) {positions:list<defined-positions>}" +
                    "{\n  }channel(s) {channels:list<defined-channels>}" +
    //				"{\n  }with a resolution of {dx:float} x {dy:float} x {dz:float} microns.",
                    "{\n  }with a plane distance of {dz:z-distance}" +
                    "{\n  }using the {lens:lens} with the {magnification:mag} and a binning of {binning:binning}",
            undefined);


    parser.defineType("start", "At the beginning",            undefined);
    parser.defineType("start", "At {time:time}",              undefined, true);
    parser.defineType("start", "After {delay:time-interval}", undefined, true);

    parser.defineSentence("{start:start}, {acquisition:acquisition}.", undefined);

    parser.defineSentence("{start:start}, {incubation:incubation}.", undefined);

    return parser;
}
