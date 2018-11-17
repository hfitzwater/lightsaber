const ws281x = require('rpi-ws281x-native');
const Gpio = require('pigpio').Gpio;
const { exec } = require('child_process');

const onSound = 'lightsaber_03.wav';
const offSound = 'lightsaber_off.wav';

// generate integer from RGB value
const getColor = (r, g, b) => {
  r = r * brightness / 255;
  g = g * brightness / 255;
  b = b * brightness / 255;
  return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
};

const COLORS = {
    OFF: getColor(0, 0, 0),
    RED: getColor(255, 0, 0),
    GREEN: getColor(0, 255, 0),
    BLUE: getColor(0, 0, 255)
};

class Saber {
    color = COLORS.GREEN;
    brightness = 255;
    isOn = false;
    NUM_LEDS = 144;

    pixelData;

    signals = {
        SIGINT: 2,
        SIGTERM: 15
    };

    constructor( color, numLEDS ) {
        this.color = color;
        this.NUM_LEDS = numLEDS;
        this.pixelData = new Uint32Array(this.NUM_LEDS);

        this.initButton();

        ws281x.init(NUM_LEDS);

        Object.keys(this.signals).forEach(signal => {
            process.on(signal, () => {
                this.shutdown(signal, signals[signal]);
            });
        });
    }

    initButton() {
        let button = new Gpio(23, {
            mode: Gpio.INPUT,
            pullUpDown: Gpio.PUD_UP,
            alert: true
        });

        button.glitchFilter(1000);

        button.on('alert', (level, tick) => {
            this.isOn = !this.isOn;
            
            if( this.isOn ) {
                this.turnOn();
            } else {
                this.turnOff();
            }
        });
    }

    shutdown(signal, value) {
        process.stdout.write(`Stopped by ${signal}`);

        for (var i = 0; i < NUM_LEDS; i++) {
            pixelData[i] = COLORS.OFF;
        }
        ws281x.render(pixelData);
        ws281x.reset();
                
        process.nextTick(() => {
            process.exit(0);
        });
    }

    turnOn() {
        this.soundOn();
        
        for(let i=0; i<40; i++ ) {
            pixelData[i] = this.color;
        }
        ws281x.render(pixelData);
        
        for(let i=40; i<NUM_LEDS; i++) {
            setTimeout(() => {
                pixelData[i] = this.color;
                ws281x.render(pixelData);
            }, i*1);
        }
    }

    turnOff() {
        this.soundOff();
        
        for(let i=143; i>=0; i--) {
            setTimeout(() => {
                pixelData[i] = COLORS.OFF;
                ws281x.render(pixelData);
            }, Math.abs(i-143)*1 );
        }
    }

    soundOn() {
        exec(`aplay ${onSound}`, (err, stdout, stderr) => {
            if( err ) {
                process.stderr.write( err );
            }
        });
    }

    soundOff() {
        exec(`aplay ${offSound}`, (err, stdout, stderr) => {
            if( err ) {
                process.stderr.write( err );
            }
        });
    }
}

const lightsaber = new Saber( COLORS.GREEN, parseInt(process.argv[2], 10) || 144 );