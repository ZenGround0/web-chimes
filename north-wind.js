import p5 from 'https://cdn.skypack.dev/p5';
import * as Tone from 'https://cdn.skypack.dev/tone';

let y = 100;
let radicalTwo = Math.sqrt(2);

// Library

// result = do_a_complicated_thing(something_i_have, something_else, more_inputs)

// Framework

/* L-System functions -- code pieces + inspiration from https://p5js.org/examples/simulate-l-systems.html */


// Idea sketch
// 1. dragon curve L system
// 2. Ephemeral drawing that slowly fades away
// 3. Push button start a new curve: https://math.stackexchange.com/questions/3064350/four-dragon-curves-are-edge-covering-plane-tiling
// 4. when curves hit predefined chime regions there is a musical effect
// 5. color of curves -- 2 yellow: #eaea5c, 1 purple: #603dd1, 1 peach ##ec8278
// 6. curves can be of different depths and should still self avoid
// 7. Lower depth curves make notes in a higher octave, shallow curves make low octave notes
//
// Remaining TODOs
// 0. Button press adds new wind <zephyr, gust>, grey out button when we hit four x 
// 1. continuous looping x 
// 2. locate chimes in image, play notes when hit
// 3. notes get lower octave as time goes on
// 4. animate a bop when chimes are hit
// 5. select speed
// 6. select scale

function DragonLSystem(p, phase, color) {
    // Drawn state
    this.scales = new Map();
    this.head = 0;
    this.tail = 0;
    this.size = 100000;
    this.seq = 0;
    this.stepSize = 1000;
    this.x = p.width / 2;
    this.y = p.height / 2;
    this.heading = p.createVector(0, 0);
    this.phase = phase
    this.phi = phase * (p.TWO_PI / 4 );
    this.color = color;

    // Curve definition
    // https://www.cs.unm.edu/~joel/PaperFoldingFractal/L-system-rules.html
    this.axiom = "F";
    this.ruleF = "F-H";
    this.ruleH = "F+H";

    // Curve state
    this.startLength = 500.0;
    this.drawLength = this.startLength;
    this.theta = p.TWO_PI / 4; // 90 degrees
    this.generations = 0;

}

DragonLSystem.prototype.generate = function (p, gen) {
    this.production = this.axiom;
    for (let i=0; i < gen; ++i) {
	this.iterate(p);
    }
    this.heading = p.createVector(0, this.drawLength)
    this.heading.rotate(this.phi);    
}
DragonLSystem.prototype.iterate = function(p) {
    let newProduction = "";
    for (let i=0; i < this.production.length; ++i) {
	let step = this.production.charAt(i);
	if (step == "F") {
	    newProduction = newProduction + this.ruleF
	}
	else if (step == "H") {
	    newProduction = newProduction + this.ruleH
	} else { // + and - preserved
	    newProduction = newProduction + step
	}
    }
    // Update LSystem wide vars
    this.drawLength = this.drawLength / radicalTwo;
    this.generations++;
    this.production = newProduction;

}

DragonLSystem.prototype.drawScale = function(p, color, i) {
    let scale = this.scales.get(i);
    p.push();
    p.translate(scale.x, scale.y);
    p.stroke(color);
    p.line(0, 0, scale.h.x, scale.h.y);	    
    p.pop();
}

DragonLSystem.prototype.removeOne = function(p) {
    p.strokeWeight(1);
    this.drawScale(p, 0, this.tail);
    this.scales.delete(this.tail);         
    this.tail = this.tail + 1;
}

DragonLSystem.prototype.renderClean = function(p, synth, chimes) {
    var done = false;
    p.push();
    p.translate(this.x, this.y);
    chimes.forEach((chime, i) => {
	if (ringChime(p, this.x, this.y, chime)) {
	    synth.triggerAttackRelease(getNote(p), "16n");
	}
    });
    // Generate data for new head 
    for (let i =this.seq; i < this.seq + this.stepSize; ++i) {
	if (this.seq == this.production.length) {
	    break; // done generating
	}
	let step = this.production.charAt(i);
	if ( step =='F' || step == 'H') {
	    p.translate(this.heading.x, this.heading.y);
	    this.scales.set(this.head, {x: this.x, y: this.y, h: p.createVector(this.heading.x, this.heading.y)});
	    this.head = this.head + 1;
	    this.x = this.x + this.heading.x;
	    this.y = this.y + this.heading.y;

	} else if (step == '+') {
	    this.heading.rotate(this.theta);
	} else if (step == '-') {
	    this.heading.rotate(-this.theta);
	}
    }
    if (this.seq < this.production.length) {
	this.seq = this.seq + this.stepSize;
	// clamp at production size
	if (this.seq > this.production.length) {
	    this.seq = this.production.length
	}
    }
    // Remove data for tail 
    if (this.scales.size > this.size ) {
	while (this.scales.size > this.size) {
	    this.scales.delete(this.tail);	    
	    this.tail = this.tail + 1;
	}
    } else if (this.seq == this.production.length) {
	for (let i=0; i < this.stepSize / 2; ++i) {
	    if (this.tail == this.head) {
		// all done 
		done = true
	    }
	    this.scales.delete(this.tail);	    
	    this.tail = this.tail + 1;	    
	}
    }    
    p.pop();

    // Render dragon from tail to head
    for (let i = this.tail; i < this.head; i++) {
	this.drawScale(p, this.color, i);
    }

    return done
}

DragonLSystem.prototype.render = function(p, synth, chimes) {
    p.push();

    p.translate(this.x, this.y);
    chimes.forEach((chime, i) => {
	if (ringChime(p, this.x, this.y, chime)) {
	    synth.triggerAttackRelease(getNote(p), "16n");
	}
    });
    for (let i =this.seq; i < this.seq + this.stepSize; ++i) {
	if (this.seq == this.production.length) {
	    break; // done generating
	}
	let step = this.production.charAt(i);
	if ( step =='F' || step == 'H') {
	    p.stroke(this.color);
	    p.line(0, 0, this.heading.x, this.heading.y);
	    
	    p.translate(this.heading.x, this.heading.y);
	    this.scales.set(this.head, {x: this.x, y: this.y, h: p.createVector(this.heading.x, this.heading.y)});
	    this.head = this.head + 1;
	    this.x = this.x + this.heading.x;
	    this.y = this.y + this.heading.y;

	} else if (step == '+') {
	    this.heading.rotate(this.theta);
	} else if (step == '-') {
	    this.heading.rotate(-this.theta);
	}
    }
    if (this.seq < this.production.length) {
	this.seq = this.seq + this.stepSize;
	// clamp at production size
	if (this.seq > this.production.length) {
	    this.seq = this.production.length
	}
    }
    
    p.pop();
    // remove the tail of the dragon
    if (this.scales.size > this.size ) {
	while (this.scales.size > this.size) {
	    this.removeOne(p);
	}
    } else if (this.seq == this.production.length) {
	for (let i=0; i < this.stepSize / 2; ++i) {
	    if (this.tail == this.head) {
		// all done 
		return true
	    }
	    this.removeOne(p);
	}
    }
    return false
}

var winds;
var colors;
var chimes;

var canvas = undefined;
var sketch_fn = function(p) {
    var synth = makeSynth();
    let fr = 20;
    p.setup = function() {
	p.createCanvas(720, 720);
	p.background(0);	
	p.frameRate(fr);
    }
    p.draw = function() {
	var allDone = true;
	chimes.forEach((chime, i) => {
	    p.fill(0);
	    p.circle(chime.x, chime.y, 5);
	});
	for (let i = 0; i < 4; i++) {
	    if (winds[i] != null) {
		let done = winds[i].render(p, synth, chimes);
		allDone = allDone && done;
		if (done) {
		    winds[i] = null;
		    buttonActivationSet();		    
		}
	    }
	}
    }
}

function initChimes(n, p) {
    var chimes = [];
    for (let i = 0; i< n; ++i) {
	chimes.push({x: p.random(720), y: p.random(720)});
    }
    return chimes
}

function ringChime(p, x, y, chime) {
    let d_squared = (x - chime.x) * (x - chime.x) + (y - chime.y) * (y - chime.y);
    if (d_squared < 1) { // Within 1 pixel ring is guaranteed 
	return true
    }
    
    // draw random value [0, 1)
    let draw = p.random();

    // compare to distance, probability decreases with inverse square
    if (draw < (1 / d_squared) * 10) {
	return true
    }
    return false
}

function buttonActivationSet() {
    let all = true
    for (let i = 0; i < 4; ++i) {
	if (winds[i] == null) {
	    all = false
	    break
	}
    }
    document.getElementById("Wind").disabled = all;
}

function refresh(chimeCnt) {
    if (canvas != null) {
	canvas.remove();
    }
    canvas = new p5(sketch_fn);
    winds = [null, null, null, null];
    colors = [ '#ec8278', '#603dd1', '#603dd1', '#eaea5c'];
    chimes = initChimes(chimeCnt, canvas);
    buttonActivationSet();
}

function init() {
    if (canvas != null) {
	return
    }
    refresh(15);
}
init();

function addWind() {
    let idxs = shuffleArray([0, 1, 2, 3]);
    for (let i = 0; i < 4; ++i) {
	if (winds[idxs[i]] == null) {
	    let wind = new DragonLSystem(canvas, idxs[i], colors[Math.floor((Math.random()*colors.length))]);
	    wind.generate(canvas, 19);
	    winds[idxs[i]] = wind;
	    buttonActivationSet();
	    return
	}
    }
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array
}
// Link northWind to its button
//document.getElementById("NorthWindButton").addEventListener("click", northWind);
document.getElementById("Wind").addEventListener("click", addWind);
var slider = document.getElementById("chimeSlide");
slider.oninput = function() {
    document.getElementById('output').innerHTML = this.value;
    refresh(this.value);
}

function makeSynth() {
    const reverb = new Tone.Reverb({
	decay: 6.8,
	wet: 1
    }).toDestination();

    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.set({
        oscillator: {
            type: 'sine',
	    harmonicity: 0.5,
	    modulationType: "sine",
            volume: -30,
        },
        envelope: {
	    attackCurve: "exponential",
            attack: 0.05,
            decay: 15,
            sustain: 0.02,
            release: 2
	},
	portamento: 0.05
    });
    synth.connect(reverb);
    
    return synth
}

function makeBamboo() {
    // Wooden/Bamboo Chime Synth
    const chime = new Tone.MembraneSynth({
	
	pitchDecay: 0.001,
        octaves: 4,
        oscillator: {
            type: 'sine'
	},                 
	envelope: {
	    attack: 0.005,
	    decay: 10,
	    sustain: 0.005,
	    release: 2,
	}
    }).toDestination();
    const reverb = new Tone.Reverb({
	decay: 0.8,
	wet: 0.2
    }).toDestination();
    chime.connect(reverb);
    return chime
}


let chords = new Map([
    ["colorful", ["C", "F", "Bb", "Eb", "Ab"]],
    ["classic", ["C", "D", "E", "G", "A"]],
    ["debussy", ["C", "D", "E", "F#", "G#"]],
    ["austere",  ["C", "G", "C", "G", "C"]],
    ["haunting", ["C", "D", "Eb", "G", "A"]],
    ["aliens", ["D", "E", "C", "C", "G"]],
    ["airy", ["G", "D", "G", "A", "C#"]],
]);

function getNote(p) {
    let select = document.getElementById("Chord")
    let chord = select.options[select.selectedIndex].value
    const octaves = [4,5,6]
    let notes = chords.get(chord);
    const note = p.random(notes) + p.random(octaves);
    return note
}


