
// DJControl_Inpulse_500_script.js
//
// ***************************************************************************
// * Mixxx mapping script file for the Hercules DJControl Inpulse 500.
// * Authors: Ev3nt1ne, DJ Phatso, resetreboot 
// *    contributions by Kerrick Staley, Bentheshrubber, ThatOneRuffian
//
//  Version 1.6c: (August 2023) resetreboot
//  * Use the full 14 bits for knobs for more precission 
//  * Add effects to the PAD 7 mode
//  * Create decks for future four channel mode
//  * Move the sampler buttons to the Deck component as well as the new effect buttons
//  * Made the filter knob have a function with filter, effect and filter + effect
//  * Use the Hotcue component for hotcues
//  * Use components and add for the rest of the controls:
//    - Play
//    - Cue
//    - Sync
//    - Volume fader
//    - EQs
//    - PFL
//    - Pad Selectors
//
// * Version 1.5c (Summer 2023)
// * Forum: https://mixxx.discourse.group/t/hercules-djcontrol-inpulse-500/19739
// * Wiki: https://mixxx.org/wiki/doku.php/hercules_djcontrol_inpulse_500
//
//  Version 1.0c:
//	* Hot Cue: implementation of the Color API (Work in progress)
//		- Assigned color directly to pad (XML)
//	* Added DECK LED number - On when playing
//  * Moved Beatjump to Pad mode 3 (Slicer)
//	* Set different color for upper (Sampler 1-4) and lower (Sampler 5-8) sampler pads
//
//  Version 1.0 - Based upon Inpulse 300 v1.2 (official)
//
// TO DO: 
//
//  * Use components for the Pads (and add to Deck): 
//    - Loops
//    - Loop rolls
//    - Slicer -> gonna be a tricky one
//    - Beat jump
//    - Tone key
//
//  * Use components and add for the rest of the controls:
//    - Pitch fader
//    - Vinyl
//    - Slip
//    - Quant
//    - Loop pot
//    - In and Out loop
//    - Load button
//
//  * Change the behavior of the FX buttons, use them as Channel selector, using the LEDs
//    as indicators of current channel.
//
//  * When enabling multichannel, ensure:
//    - Beat matching guide follow correctly the selected channel
//    - Volume meters follow correctly the selected channel
//
// ****************************************************************************
var DJCi500 = {};
///////////////////////////////////////////////////////////////
//                       USER OPTIONS                        //
///////////////////////////////////////////////////////////////

// How fast scratching is.
DJCi500.scratchScale = 1.0;

// How much faster seeking (shift+scratch) is than scratching.
DJCi500.scratchShiftMultiplier = 4;

// How fast bending is.
DJCi500.bendScale = 1.0;
// Other scratch related options
DJCi500.kScratchActionNone = 0;
DJCi500.kScratchActionScratch = 1;
DJCi500.kScratchActionSeek = 2;
DJCi500.kScratchActionBend = 3;
DJCi500.FxLedtimer;

// Colors
DJCi500.PadColorMapper = new ColorMapper({
    0xFF0000: 0x60,
    0xFFFF00: 0x7C,
    0x00FF00: 0x1C,
    0x00FFFF: 0x1F,
    0x0000FF: 0x03,
    0xFF00FF: 0x42,
    0xFF88FF: 0x63,
    0xFFFFFF: 0x7F,
    0x000088: 0x02,
    0x008800: 0x10,
    0x008888: 0x12,
    0x228800: 0x30,
    0x880000: 0x40,
    0x882200: 0x4C,
    0x888800: 0x50,
    0x888888: 0x52,
    0x88FF00: 0x5C,
    0xFF8800: 0x74,
});


//Ev3nt1ne Global Var:
DJCi500.FxD1Active = [0, 0, 0]; //Here I decided to put only 3 effects
DJCi500.FxD2Active = [0, 0, 0]; //Here I decided to put only 3 effects
DJCi500.FxDeckSel = 0; // state variable for fx4 to decide the deck
DJCi500.prevFilterUse = [0, 0]; //id of the array, one for each deck
DJCi500.pitchRanges = [0.08, 0.32, 1]; //select pitch range
DJCi500.pitchRangesId = [0, 0]; //id of the array, one for each deck
DJCi500.slowPauseSetState = [0, 0];
///////////////////////////////////////////////////////////////
//                          SLICER                           //
///////////////////////////////////////////////////////////////
//PioneerDDJSX.selectedSlicerQuantizeParam = [1, 1, 1, 1];
//PioneerDDJSX.selectedSlicerQuantization = [1 / 4, 1 / 4, 1 / 4, 1 / 4];
//PioneerDDJSX.slicerQuantizations = [1 / 8, 1 / 4, 1 / 2, 1];
//PioneerDDJSX.selectedSlicerDomainParam = [0, 0, 0, 0];
DJCi500.selectedSlicerDomain = [8, 8, 8, 8]; //length of the Slicer domain
//PioneerDDJSX.slicerDomains = [8, 16, 32, 64];

// slicer storage:
DJCi500.slicerBeatsPassed = [0, 0, 0, 0];
DJCi500.slicerPreviousBeatsPassed = [0, 0, 0, 0];
DJCi500.slicerTimer = [false, false, false, false];
//DJCi500.slicerJumping = [0, 0, 0, 0];
DJCi500.slicerActive = [false, false, false, false];
DJCi500.slicerAlreadyJumped = [false, false, false, false];
DJCi500.slicerButton = [-1, -1, -1, -1];
DJCi500.slicerModes = {
    'contSlice': 0,
    'loopSlice': 1
};
DJCi500.activeSlicerMode = [
    DJCi500.slicerModes.contSlice,
    DJCi500.slicerModes.contSlice,
    DJCi500.slicerModes.contSlice,
    DJCi500.slicerModes.contSlice
];
DJCi500.slicerLoopBeat8 = [0, 0, 0, 0];
///////////////////////

DJCi500.vuMeterUpdateMaster = function(value, _group, control) {
  value = (value * 122) + 5;
  var control = (control === "VuMeterL") ? 0x40 : 0x41;
  midi.sendShortMsg(0xB0, control, value);
};

DJCi500.vuMeterUpdateDeck = function(value, group, _control, _status) {
  // TODO: Devise a way to know if the current channel is active on the 
  // current deck (so we don't get mixed vu meters from deck 3 on deck 1,
  // for example
	value = (value * 122) + 5;
  var channel = parseInt(group.charAt(8));
	var status = (group === "[Channel1]") ? 0xB1 : 0xB2;
	midi.sendShortMsg(status, 0x40, value);
};

DJCi500.Deck = function (deckNumbers, midiChannel) {
  components.Deck.call(this, deckNumbers);
  // Allow components to access deck variables
  var deckData = this;

  // Brake status for this deck
  this.slowPauseSetState = false;

  // slicerMode status
  this.slicerActive = false;

  // Effect section components
  this.onlyEffectEnabled = false;
  this.filterAndEffectEnabled = false;

  // Make sure the shift button remaps the shift actions
  this.shiftButton = new components.Button({
    midi: [0x90 + midiChannel, 0x04],
    input: function(_channel, _control, value, _status, _group) {
      if (value == 0x7F) {
        deckData.forEachComponent(function(component) {
          if (component.unshift) {
            component.shift();
          }
        });
      } else {
        deckData.forEachComponent(function(component) {
          if (component.unshift) {
            component.unshift();
          }
        });
      }
    },
  });

  this.loadButton = new components.Button({
    midi: [0x90 + midiChannel, 0x0D],
    shiftOffset: 3,
    shiftControl: false,
    shiftChannel: true,
    sendShifted: true,
    unshift: function () {
      this.inKey = 'LoadSelectedTrack';
    },
    shift: function () {
      this.input = function (channel, control, value, status, group) {
        var deck = parseInt(group.charAt(8));
        switch (deck) {
          case 1:
            engine.setValue(group, "CloneFromDeck", 2);
            break;

          case 2:
            engine.setValue(group, "CloneFromDeck", 1);
            break;

          case 3:
            engine.setValue(group, "CloneFromDeck", 4);
            break;

          case 4:
            engine.setValue(group, "CloneFromDeck", 3);
            break;

        };
      };
    }
  });

  this.playButton = new components.PlayButton({
    midi: [0x90 + midiChannel, 0x07],
    shiftOffset: 3,
    shiftControl: false,
    shiftChannel: true,
    sendShifted: true,
    unshift: function () {
      this.input = function (channel, control, value, status, group) {
        if (value == 0x7F) {
          if (engine.getValue(group, "play_latched")) {      //play_indicator play_latched
            var deck = parseInt(group.charAt(8));
            if (deckData.slowPauseSetState) {
              engine.brake((deck+1),
                1,//((status & 0xF0) !== 0x80 && value > 0),
                54);
            } else {
              script.toggleControl(group, "play");
            }
          } else {
            script.toggleControl(group, "play");
          }
        }
      };
    },
    shift: function () {
      this.input = function (_channel, _control, _value, _status, group) {
        engine.setValue(group, "play_stutter", true);
      };
    },
  });

  this.cueButton = new components.CueButton({
    midi: [0x90 + midiChannel, 0x06],
    shiftOffset: 3,
    shiftControl: false,
    shiftChannel: true,
    sendShifted: true,
    shift: function () {
      this.inKey = "start_play";
    },
  });

  this.syncButton = new components.SyncButton({
    midi: [0x90 + midiChannel, 0x05],
    shiftOffset: 3,
    shiftControl: false,
    shiftChannel: true,
    sendShifted: true,
    shift: function () {
      this.inKey = "sync_key";
    },
  });

  this.pflButton = new components.Button({
    midi: [0x90 + midiChannel, 0x0C],
    type: components.Button.prototype.types.toggle,
    key: 'pfl',
  });

  // Knobs
  this.volume = new components.Pot({
    midi: [0xB0 + midiChannel, 0x00],
    inKey: 'volume',
  });

  this.eqKnob = [];
  for (var k = 1; k <= 3; k++) {
    this.eqKnob[k] = new components.Pot({
      midi: [0xB0 + midiChannel, 0x01 + k],
      group: '[EqualizerRack1_' + this.currentDeck + '_Effect1]',
      inKey: 'parameter' + k,
    });
  }

  this.gainKnob = new components.Pot({
    midi: [0xB0 + midiChannel, 0x05],
    inKey: 'pregain',
  });

  // We only check and attach for slicer mode, but we have all
  // pad buttons here if we need something extra!
  this.padSelectButtons = [];
  for (var i = 1; i <= 8; i++) {
    this.padSelectButtons[i] = new components.Button({
      midi: [0x90 + midiChannel, 0x0F + (i - 1)],
      input: function(channel, control, value, status, group) {
        if (control == 0x11) {
          deckData.slicerActive = true;
        } else {
          deckData.slicerActive = false;
        }
      },
    });
  }
  
  // Hotcue buttons
  this.hotcueButtons = [];
  for (var i = 1; i <= 8; i++) {
    this.hotcueButtons[i] = new components.HotcueButton({
      midi: [0x95 + midiChannel, 0x00 + (i - 1)],
      number: i,
      shiftOffset: 8,
      shiftControl: true,
      sendShifted: true,
      colorMapper: DJCi500.PadColorMapper,
      off: 0x00,
    });
  };

  this.effectButtons = [];
  for (var i = 1; i <= 3; i++) {
    // First top row effects buttons, just the effect, disable HPF/LPF knob
    this.effectButtons[i] = new components.Button({
      midi: [0x95 + midiChannel, 0x60 + (i - 1)],
      number: i,
      shiftOffset: 8,
      shiftControl: true,
      sendShifted: true,
      group: "[EffectRack1_EffectUnit" + midiChannel + "_Effect" + i + "]",
      outKey: "enabled",
      output: function (_value, group, control) {
        if (deckData.onlyEffectEnabled) {
          this.send(0x7F);
        } else {
          this.send(0x7C);
        }
      },
      unshift: function() {
        // Normal effect button operation, toggling the effect assigned to it
        this.input = function (channel, control, value, status, group) {
          var fxNo = control - 0x5F;
          var deckChan = parseInt(group.charAt(8));
          if (value == 0x7F){
            deckData.filterAndEffectEnabled = false;
            deckData.onlyEffectEnabled = !engine.getValue("[EffectRack1_EffectUnit" + deckChan + "_Effect" + fxNo + "]", "enabled");
            script.toggleControl("[EffectRack1_EffectUnit" + deckChan + "_Effect" + fxNo + "]", "enabled");
          }
        };
      },
      shift: function () {
        // Shift button will change the effect to the next in the list
        this.input = function (channel, control, value, status, group) {
          var fxNo = control - 0x67;
          var deckChan = parseInt(group.charAt(8));
          if (value == 0x7F){
            engine.setValue("[EffectRack1_EffectUnit" + deckChan + "_Effect" + fxNo + "]", 'effect_selector', +1);
          }
        };
      }
    });

    // Lower row, effect + HPF/LPF button on filter knob
    this.effectButtons[i + 4] = new components.Button({
      midi: [0x95 + midiChannel, 0x60 + (i + 3)],
      number: i + 4,
      shiftOffset: 8,
      shiftControl: true,
      sendShifted: true,
      group: "[EffectRack1_EffectUnit" + midiChannel + "_Effect" + i + "]",
      outKey: "enabled",
      output: function (_value, group, control) {
        if (deckData.filterAndEffectEnabled) {
          this.send(0x7F);
        } else {
          this.send(0x7C);
        }
      },
      unshift: function() {
        // Normal effect button operation, toggling the effect assigned to it
        this.input = function (channel, control, value, status, group) {
          var fxNo = control - 0x63;
          var deckChan = parseInt(group.charAt(8));
          if (value == 0x7F){
            deckData.filterAndEffectEnabled = !engine.getValue("[EffectRack1_EffectUnit" + deckChan + "_Effect" + fxNo + "]", "enabled");
            deckData.onlyEffectEnabled = false;
            script.toggleControl("[EffectRack1_EffectUnit" + deckChan + "_Effect" + fxNo + "]", "enabled");
          }
        };
      },
      shift: function () {
        // Shift button will change the effect to the next in the list
        this.input = function (channel, control, value, status, group) {
          var fxNo = control - 0x6B;
          var deckChan = parseInt(group.charAt(8));
          if (value == 0x7F){
            engine.setValue("[EffectRack1_EffectUnit" + deckChan + "_Effect" + fxNo + "]", 'effect_selector', -1);
          }
        };
      }
    });
  };

  // For completeness, these buttons are, for now, just simply disabled.
  this.effectButtons[4] = new components.Button({
    midi: [0x95 + midiChannel, 0x63],
    number: 4,
    shiftOffset: 8,
    shiftControl: true,
    sendShifted: true,
    input: function (_channel, _control, _value, _status, group) {
      ;;
    }
  });

  this.effectButtons[8] = new components.Button({
    midi: [0x95 + midiChannel, 0x67],
    number: 8,
    shiftOffset: 8,
    shiftControl: true,
    sendShifted: false,
    on: 0x00,
    off: 0x00,
    input: function (_channel, _control, _value, _status, _group) {
      ;;
    }
  });

  this.filterKnob = new components.Pot({
    midi: [0xB0 + midiChannel, 0x01],
    number: midiChannel,
    input: function (channel, control, value, status, group) {
     if ((deckData.onlyEffectEnabled) || (deckData.filterAndEffectEnabled)) {
        // Move the effects knobs
        engine.setValue("[EffectRack1_EffectUnit" + this.number + "]", "super1", Math.abs(script.absoluteNonLin(value, 0.0, 0.5, 1.0, 0, 127) - 0.5)*2 );
     }
     if ((deckData.filterAndEffectEnabled) || (!deckData.onlyEffectEnabled)) {
        // Move the filter knob
        engine.setValue("[QuickEffectRack1_" + group + "]", "super1", script.absoluteNonLin(value, 0.0, 0.5, 1.0, 0, 127));
     }
    },
  });

  // Sampler buttons
  this.samplerButtons = [];
  for (var i = 1; i <= 8; i++) {
      this.samplerButtons[i] = new components.SamplerButton({
        midi: [0x95 + midiChannel, 0x30 + (i - 1)],
        number: i,
        shiftOffset: 8,
        shiftControl: true,
        sendShifted: true,
        loaded: 0x42,
        empty: 0x00,
        playing: 0x63,
        looping: 0x74,
      });
  };

  // As per Mixxx wiki, set the group properties
  this.reconnectComponents(function (c) {
    if (c.group === undefined) {
      c.group = this.currentDeck;
    }
  });
}

// Give the custom Deck all the methods of the generic deck
DJCi500.Deck.prototype = new components.Deck();

DJCi500.init = function() {
  // Scratch button state
  DJCi500.scratchButtonState = true;
  // Scratch Action
  DJCi500.scratchAction = {
    1: DJCi500.kScratchActionNone,
    2: DJCi500.kScratchActionNone
  };

  DJCi500.AutoHotcueColors = true;

  // Take care of the status of the crossfader status
  DJCi500.crossfaderEnabled = true;
  DJCi500.xFaderScratch = false;

  // Turn On Vinyl buttons LED(one for each deck).
  midi.sendShortMsg(0x91, 0x03, 0x7F);
  midi.sendShortMsg(0x92, 0x03, 0x7F);
  //Turn On Browser button LED
  midi.sendShortMsg(0x90, 0x05, 0x10);
  //Softtakeover for Pitch fader
  engine.softTakeover("[Channel1]", "rate", true);
  engine.softTakeover("[Channel2]", "rate", true);
  engine.softTakeoverIgnoreNextValue("[Channel1]", "rate");
  engine.softTakeoverIgnoreNextValue("[Channel2]", "rate");

  // Connect the VUMeters
  engine.connectControl("[Channel1]", "VuMeter", "DJCi500.vuMeterUpdateDeck");
  engine.getValue("[Channel1]", "VuMeter", "DJCi500.vuMeterUpdateDeck");
  engine.connectControl("[Channel2]", "VuMeter", "DJCi500.vuMeterUpdateDeck");
  engine.getValue("[Channel2]", "VuMeter", "DJCi500.vuMeterUpdateDeck");
  engine.connectControl("[Channel3]", "VuMeter", "DJCi500.vuMeterUpdateDeck");
  engine.getValue("[Channel3]", "VuMeter", "DJCi500.vuMeterUpdateDeck");
  engine.connectControl("[Channel4]", "VuMeter", "DJCi500.vuMeterUpdateDeck");
  engine.getValue("[Channel4]", "VuMeter", "DJCi500.vuMeterUpdateDeck");

  engine.connectControl("[Master]", "VuMeterL", "DJCi500.vuMeterUpdateMaster");
  engine.connectControl("[Master]", "VuMeterR", "DJCi500.vuMeterUpdateMaster");

  engine.getValue("[Master]", "VuMeterL", "DJCi500.vuMeterUpdateMaster");
  engine.getValue("[Master]", "VuMeterR", "DJCi500.vuMeterUpdateMaster");
  engine.getValue("[Controls]", "AutoHotcueColors", "DJCi500.AutoHotcueColors");

  /* 
  //Ev3nt1ne Code
  var fx1D1Connection = engine.makeConnection('[EffectRack1_EffectUnit1_Effect1]', 'enabled', DJCi500.fx1D1Callback);
  var fx2D1Connection = engine.makeConnection('[EffectRack1_EffectUnit1_Effect2]', 'enabled', DJCi500.fx2D1Callback);
  var fx3D1Connection = engine.makeConnection('[EffectRack1_EffectUnit1_Effect3]', 'enabled', DJCi500.fx3D1Callback);
  var fx1D2Connection = engine.makeConnection('[EffectRack1_EffectUnit2_Effect1]', 'enabled', DJCi500.fx1D2Callback);
  var fx2D2Connection = engine.makeConnection('[EffectRack1_EffectUnit2_Effect2]', 'enabled', DJCi500.fx2D2Callback);
  var fx3D2Connection = engine.makeConnection('[EffectRack1_EffectUnit2_Effect3]', 'enabled', DJCi500.fx3D2Callback);
  //var fx4Connection = engine.makeConnection('[EffectRack1_EffectUnit1_Effect4]', 'enabled', DJCi500.fx4Callback);
  */
  var slicerBeatConnection1 = engine.makeConnection('[Channel1]', 'beat_active', DJCi500.slicerBeatActive);
  var slicerBeatConnection2 = engine.makeConnection('[Channel2]', 'beat_active', DJCi500.slicerBeatActive);
  //var controlsToFunctions = {'beat_active': 'DJCi500.slicerBeatActive'};
  //script.bindConnections('[Channel1]', controlsToFunctions, true);

  // Ask the controller to send all current knob/slider values over MIDI, which will update
  // the corresponding GUI controls in MIXXX.
  midi.sendShortMsg(0xB0, 0x7F, 0x7F);

  // Turn on lights:
  for (var i = 0; i < 2; i++) {
     midi.sendShortMsg(0x96+i, 0x40, 0x2);
     midi.sendShortMsg(0x96+i, 0x41, 0x2);
     midi.sendShortMsg(0x96+i, 0x42, 0x78);
     midi.sendShortMsg(0x96+i, 0x43, 0x78);
     midi.sendShortMsg(0x96+i, 0x45, 0x37);
     midi.sendShortMsg(0x96+i, 0x46, 0x24);
   }

  // Bind the hotcue colors
  // DJCi500.enableHotcueColors();
  // Bind the sampler buttons
  // DJCi500.enableSamplerButtons();

  DJCi500.FxLedtimer = engine.beginTimer(250,"DJCi500.tempoLEDs()");

  // Create the deck objects
  DJCi500.deckA = new DJCi500.Deck([1, 3], 1);
  DJCi500.deckB = new DJCi500.Deck([2, 4], 2);
};

// Crossfader control, set the curve
DJCi500.crossfaderSetCurve = function(channel, control, value, _status, _group) {
  switch(value) {
    case 0x00:
      // Mix
      script.crossfaderCurve(0,0,127);
      DJCi500.xFaderScratch = false;
      break;
    case 0x7F:
      // Scratch
      script.crossfaderCurve(127,0,127);
      DJCi500.xFaderScratch = true;
      break;
  }
}

// Crossfader enable or disable
DJCi500.crossfaderEnable = function(channel, control, value, _status, _group) {
  if(value) {  
    DJCi500.crossfaderEnabled = true;
  } else {
    DJCi500.crossfaderEnabled = false;
    engine.setValue("[Master]", "crossfader", 0);    // Set the crossfader in the middle
  }
}

// Crossfader function
DJCi500.crossfader = function(channel, control, value, status, group) {
  if (DJCi500.crossfaderEnabled) {
    // Eventine's crossfader scratch mode
    if (DJCi500.xFaderScratch) {
        var result = 0;
        if (value <= 0) {
            result = -1;
        } 
        else if (value >= 127) {
            result = 1;
        }
        else {
            result = Math.tan((value-64)*Math.PI/2/63)/32;
        }
        engine.setValue(group, "crossfader", result);
    }
    else {
        engine.setValue(group, "crossfader", (value/64)-1);
    }
  }
}

// Browser button. We move it to a custom JS function to avoid having to focus the Mixxx window for it to respond
DJCi500.moveLibrary = function(channel, control, value, status, group) {
  if (value > 0x3F) {
    engine.setValue('[Playlist]', 'SelectTrackKnob', -1);
  } else {
    engine.setValue('[Playlist]', 'SelectTrackKnob', 1);
  }
}

// The Vinyl button, used to enable or disable scratching on the jog wheels (One per deck).

DJCi500.vinylButton = function(_channel, _control, value, status, _group) {
    if (value) {
        if (DJCi500.scratchButtonState) {
            DJCi500.scratchButtonState = false;
            midi.sendShortMsg(status, 0x03, 0x00);

        } else {
            DJCi500.scratchButtonState = true;
            midi.sendShortMsg(status, 0x03, 0x7F);

        }
    }
};

DJCi500._scratchEnable = function(deck) {
    var alpha = 1.0/8;
    var beta = alpha/32;
    engine.scratchEnable(deck, 248, 33 + 1/3, alpha, beta);
};


DJCi500._convertWheelRotation = function (value) {
    // When you rotate the jogwheel, the controller always sends either 0x1
    // (clockwise) or 0x7F (counter clockwise). 0x1 should map to 1, 0x7F
    // should map to -1 (IOW it's 7-bit signed).
    return value < 0x40 ? 1 : -1;
};


// The touch action on the jog wheel's top surface
DJCi500.wheelTouch = function(channel, control, value, _status, _group) {
    var deck = channel;
    if (value > 0) {
        //  Touching the wheel.
        if (engine.getValue("[Channel" + deck + "]", "play") !== 1 || DJCi500.scratchButtonState) {
            DJCi500._scratchEnable(deck);
            DJCi500.scratchAction[deck] = DJCi500.kScratchActionScratch;
        } else {
            DJCi500.scratchAction[deck] = DJCi500.kScratchActionBend;
        }
    } else {
        // Released the wheel.
        engine.scratchDisable(deck);
        DJCi500.scratchAction[deck] = DJCi500.kScratchActionNone;
    }
};


// The touch action on the jog wheel's top surface while holding shift
DJCi500.wheelTouchShift = function(channel, control, value, _status, _group) {
    var deck = channel - 3;
    // We always enable scratching regardless of button state.
    if (value > 0) {
        DJCi500._scratchEnable(deck);
        DJCi500.scratchAction[deck] = DJCi500.kScratchActionSeek;

    } else {
        // Released the wheel.
        engine.scratchDisable(deck);
        DJCi500.scratchAction[deck] = DJCi500.kScratchActionNone;
    }
};


// Scratching on the jog wheel (rotating it while pressing the top surface)
DJCi500.scratchWheel = function(channel, control, value, status, _group) {
    var deck;
    switch (status) {
    case 0xB1:
    case 0xB4:
        deck  = 1;
        break;
    case 0xB2:
    case 0xB5:
        deck  = 2;
        break;
    default:
        return;
    }
    var interval = DJCi500._convertWheelRotation(value);
    var scratchAction = DJCi500.scratchAction[deck];

    if (scratchAction === DJCi500.kScratchActionScratch) {
        engine.scratchTick(deck, interval * DJCi500.scratchScale);
    } else if (scratchAction === DJCi500.kScratchActionSeek) {
        engine.scratchTick(deck,
            interval *  DJCi500.scratchScale *
            DJCi500.scratchShiftMultiplier);
    } else {
        engine.setValue(
            "[Channel" + deck + "]", "jog", interval * DJCi500.bendScale);
    }
};

// Bending on the jog wheel (rotating using the edge)
DJCi500.bendWheel = function(channel, control, value, _status, _group) {
    var interval = DJCi500._convertWheelRotation(value);
    engine.setValue(
        "[Channel" + channel + "]", "jog", interval * DJCi500.bendScale);
};

DJCi500.spinback_button = function(channel, control, value, status, group) {
        var deck = parseInt(group.substring(8,9)); // work out which deck we are using
        engine.spinback(deck, value > 0, 2.5); // use default starting rate of -10 but decrease speed more quickly
    }


//Loop Encoder
DJCi500.loopHalveDouble = function (channel, control, value, status, group) {
    if (value >= 0x40) {
        script.toggleControl(group, "loop_halve");
    } else {
        script.toggleControl(group, "loop_double");
    }
};


//Led
DJCi500.tempoLEDs = function () {
    //Tempo:
    var tempo1 = engine.getValue("[Channel1]", "bpm");
    var tempo2 = engine.getValue("[Channel2]", "bpm");
    var diff = tempo1 - tempo2;

    //Check double tempo:
    var doubleTempo = 0;
    if (diff > 0){
        if ((tempo1 / tempo2) > 1.5){doubleTempo = 1; diff = tempo1/2 - tempo2;}
    }
    else{
        if ((tempo2 / tempo1) > 1.5){doubleTempo = 1; diff = tempo1 - tempo2/2;}
    }

    if ( diff < -0.25)
    {
        //Deck1
        midi.sendShortMsg(0x91, 0x1E, 0x0);
        midi.sendShortMsg(0x91, 0x1F, 0x7F);
        midi.sendShortMsg(0x91, 0x2C, 0x0);
        //Deck2
        midi.sendShortMsg(0x92, 0x1F, 0x0);
        midi.sendShortMsg(0x92, 0x1E, 0x7F);
        midi.sendShortMsg(0x92, 0x2C, 0x0);

        //clear beatalign leds
        //Deck1
        midi.sendShortMsg(0x91, 0x1C, 0x0);
        midi.sendShortMsg(0x91, 0x1D, 0x0);
        midi.sendShortMsg(0x91, 0x2D, 0x0);
        //Deck2
        midi.sendShortMsg(0x92, 0x1C, 0x0);
        midi.sendShortMsg(0x92, 0x1D, 0x0);
        midi.sendShortMsg(0x92, 0x2D, 0x0);
    }
    else if ( diff > 0.25)
    {
        //Deck1
        midi.sendShortMsg(0x91, 0x1F, 0x0);
        midi.sendShortMsg(0x91, 0x1E, 0x7F);
        midi.sendShortMsg(0x91, 0x2C, 0x0);
        //Deck2
        midi.sendShortMsg(0x92, 0x1E, 0x0);
        midi.sendShortMsg(0x92, 0x1F, 0x7F);
        midi.sendShortMsg(0x92, 0x2C, 0x0);

        //clear beatalign leds
        //Deck1
        midi.sendShortMsg(0x91, 0x1C, 0x0);
        midi.sendShortMsg(0x91, 0x1D, 0x0);
        midi.sendShortMsg(0x91, 0x2D, 0x0);
        //Deck2
        midi.sendShortMsg(0x92, 0x1C, 0x0);
        midi.sendShortMsg(0x92, 0x1D, 0x0);
        midi.sendShortMsg(0x92, 0x2D, 0x0);
    }
    else {
        //Deck1
        midi.sendShortMsg(0x91, 0x1E, 0x0);
        midi.sendShortMsg(0x91, 0x1F, 0x0);
        midi.sendShortMsg(0x91, 0x2C, 0x7F);
        //Deck2
        midi.sendShortMsg(0x92, 0x1E, 0x0);
        midi.sendShortMsg(0x92, 0x1F, 0x0);
        midi.sendShortMsg(0x92, 0x2C, 0x7F);

        //Do beat alignement only if the tracks are already on Tempo
        // and only if they are playing
        if ( (engine.getValue("[Channel1]", "play_latched")) && (engine.getValue("[Channel2]", "play_latched")) ){

            var beat1 = engine.getValue("[Channel1]", "beat_distance");
            var beat2 = engine.getValue("[Channel2]", "beat_distance");
            if (doubleTempo){
                if (tempo1 > tempo2){
                    if (beat2 > 0.5){
                        beat2 -= 0.5;
                    }
                    beat2 *= 2;
                }
                else{ //tempo2 >(=) tempo1
                    if (beat1 > 0.5){
                        beat1 -= 0.5;
                    }
                    beat1 *= 2;
                }
            }
            diff = beat1 - beat2;
            if (diff < 0){
                diff = 1+diff;
            }
            if ((diff < 0.02) || (diff > 1-0.02))
            {
                //Deck1
                midi.sendShortMsg(0x91, 0x1C, 0x0);
                midi.sendShortMsg(0x91, 0x1D, 0x0);
                midi.sendShortMsg(0x91, 0x2D, 0x7F);
                //Deck2
                midi.sendShortMsg(0x92, 0x1C, 0x0);
                midi.sendShortMsg(0x92, 0x1D, 0x0);
                midi.sendShortMsg(0x92, 0x2D, 0x7F);
            }
            else if ( diff < 0.5)
            {
                //Deck1
                midi.sendShortMsg(0x91, 0x1C, 0x0);
                midi.sendShortMsg(0x91, 0x1D, 0x7F);
                midi.sendShortMsg(0x91, 0x2D, 0x0);
                //Deck2
                midi.sendShortMsg(0x92, 0x1D, 0x0);
                midi.sendShortMsg(0x92, 0x1C, 0x7F);
                midi.sendShortMsg(0x91, 0x2D, 0x0);
            }
            else {
                //Deck1
                midi.sendShortMsg(0x91, 0x1D, 0x0);
                midi.sendShortMsg(0x91, 0x1C, 0x7F);
                midi.sendShortMsg(0x91, 0x2D, 0x0);
                //Deck2
                midi.sendShortMsg(0x92, 0x1C, 0x0);
                midi.sendShortMsg(0x92, 0x1D, 0x7F);
                midi.sendShortMsg(0x92, 0x2D, 0x0);
            }
        }//if playing
        else {
            //Deck1
            midi.sendShortMsg(0x91, 0x1C, 0x0);
            midi.sendShortMsg(0x91, 0x1D, 0x0);
            midi.sendShortMsg(0x91, 0x2D, 0x0);
            //Deck2
            midi.sendShortMsg(0x92, 0x1C, 0x0);
            midi.sendShortMsg(0x92, 0x1D, 0x0);
            midi.sendShortMsg(0x92, 0x2D, 0x0);
        }
    }//else tempo


};

///Pad 7
DJCi500.pitchUpTone = function (channel, control, value, status, group) {
    if (value == 0x7F){
        engine.setValue(group, "pitch_up", 1);
        engine.setValue(group, "pitch_up", 1);
        midi.sendShortMsg(status, control, 0x70); //104 //68
    }
    else {
        midi.sendShortMsg(status, control, 0x78); //36 //24
    }
};

DJCi500.pitchDownTone = function (channel, control, value, status, group) {
    if (value == 0x7F){
        engine.setValue(group, "pitch_down", 1);
        engine.setValue(group, "pitch_down", 1);
        midi.sendShortMsg(status, control, 0x3);
    }
    else {
        midi.sendShortMsg(status, control, 0x2);
    }
};

DJCi500.pitchUpSemiTone = function (channel, control, value, status, group) {
    if (value == 0x7F){
        engine.setValue(group, "pitch_up", 1);
        midi.sendShortMsg(status, control, 0x70); //120
    }
    else {
        midi.sendShortMsg(status, control, 0x78); //78 //4C
    }
};

DJCi500.pitchDownSemiTone = function (channel, control, value, status, group) {
    if (value == 0x7F){
        engine.setValue(group, "pitch_down", 1);
        midi.sendShortMsg(status, control, 0x3); //104
    }
    else {
        midi.sendShortMsg(status, control, 0x2); //36
    }
};

DJCi500.pitchSliderIncrease = function (channel, control, value, status, group) {

    if (value == 0x7F){
        var deck = 0;
        if (group == "[Channel1]") {
            deck = 0;
        }
        else if (group == "[Channel2]") {
            deck = 1;
        }

        DJCi500.pitchRangesId[deck] = DJCi500.pitchRangesId[deck] + 1;
        if (DJCi500.pitchRangesId[deck] > 2)
        {
            DJCi500.pitchRangesId[deck] = 2;
        }
        engine.setValue(group, "rateRange", DJCi500.pitchRanges[DJCi500.pitchRangesId[deck]]);

        midi.sendShortMsg(status, control, 0x64); //68(104)
    }
    else {
        midi.sendShortMsg(status, control, 0x24); //36
    }
};

DJCi500.pitchSliderDecrease = function (channel, control, value, status, group) {

    if (value == 0x7F){
        var deck = 0;
        if (group == "[Channel1]") {
            deck = 0;
        }
        else if (group == "[Channel2]") {
            deck = 1;
        }

        DJCi500.pitchRangesId[deck] = DJCi500.pitchRangesId[deck] - 1;
        if (DJCi500.pitchRangesId[deck] < 0)
        {
            DJCi500.pitchRangesId[deck] = 0;
        }
        engine.setValue(group, "rateRange", DJCi500.pitchRanges[DJCi500.pitchRangesId[deck]]);
        midi.sendShortMsg(status, control, 0x3F); //17 -- 3B
    }
    else {
        midi.sendShortMsg(status, control, 0x37); //3B -- 33
    }
};

DJCi500.pitchSliderReset = function (channel, control, value, status, group) {
    if (value == 0x7F){
        var deck = 0;
        if (group == "[Channel1]") {
            deck = 0;
        }
        else if (group == "[Channel2]") {
            deck = 1;
        }
        DJCi500.pitchRangesId[deck] = 0;
        engine.setValue(group, "rateRange", DJCi500.pitchRanges[DJCi500.pitchRangesId[deck]]);
    }
};

DJCi500.slowPauseSet = function (channel, control, value, status, group) {

    if (value == 0x7F){
        var deck = parseInt(group.substring(8, 9)) - 1;
        DJCi500.slowPauseSetState[deck] = !DJCi500.slowPauseSetState[deck];
    }

};

///////////////////////////////////////////////////////////////
//                          SLICER                           //
///////////////////////////////////////////////////////////////
/*
PioneerDDJSX.toggleSlicerMode = function(channel, control, value, status, group) {
    var deck = PioneerDDJSX.channelGroups[group];
    //SLICER
    if (value) {
        if (PioneerDDJSX.activePadMode[deck] === PioneerDDJSX.padModes.slicer &&
            PioneerDDJSX.activeSlicerMode[deck] === PioneerDDJSX.slicerModes.contSlice) {
            PioneerDDJSX.activeSlicerMode[deck] = PioneerDDJSX.slicerModes.loopSlice;
            engine.setValue(group, "slip_enabled", true);
        } else {
            PioneerDDJSX.activeSlicerMode[deck] = PioneerDDJSX.slicerModes.contSlice;
            engine.setValue(group, "slip_enabled", false);
        }
        PioneerDDJSX.activePadMode[deck] = PioneerDDJSX.padModes.slicer;
        PioneerDDJSX.nonPadLedControl(group, PioneerDDJSX.nonPadLeds.slicerMode, value);
    }
};
*/
////
//Slicer Mode:
/*
if (ctrl === PioneerDDJSX.nonPadLeds.parameterLeftSlicerMode || ctrl === PioneerDDJSX.nonPadLeds.parameterRightSlicerMode) {
    // change parameter set:
    if (ctrl === PioneerDDJSX.nonPadLeds.parameterLeftSlicerMode && PioneerDDJSX.selectedSlicerQuantizeParam[deck] > 0) {
        PioneerDDJSX.selectedSlicerQuantizeParam[deck] -= 1;
    } else if (ctrl === PioneerDDJSX.nonPadLeds.parameterRightSlicerMode && PioneerDDJSX.selectedSlicerQuantizeParam[deck] < 3) {
        PioneerDDJSX.selectedSlicerQuantizeParam[deck] += 1;
    }
    PioneerDDJSX.selectedSlicerQuantization[deck] = PioneerDDJSX.slicerQuantizations[PioneerDDJSX.selectedSlicerQuantizeParam[deck]];
}
//Slicer Mode + SHIFT:
if (ctrl === PioneerDDJSX.nonPadLeds.shiftParameterLeftSlicerMode || ctrl === PioneerDDJSX.nonPadLeds.shiftParameterRightSlicerMode) {
    // change parameter set:
    if (ctrl === PioneerDDJSX.nonPadLeds.shiftParameterLeftSlicerMode && PioneerDDJSX.selectedSlicerDomainParam[deck] > 0) {
        PioneerDDJSX.selectedSlicerDomainParam[deck] -= 1;
    } else if (ctrl === PioneerDDJSX.nonPadLeds.shiftParameterRightSlicerMode && PioneerDDJSX.selectedSlicerDomainParam[deck] < 3) {
        PioneerDDJSX.selectedSlicerDomainParam[deck] += 1;
    }
    PioneerDDJSX.selectedSlicerDomain[deck] = PioneerDDJSX.slicerDomains[PioneerDDJSX.selectedSlicerDomainParam[deck]];
}
*/
/////
//
DJCi500.slicerButtons = function(channel, control, value, status, group) {
    var index = control - 0x20,
        deck = parseInt(group.substring(8, 9)) - 1,
        domain = DJCi500.selectedSlicerDomain[deck],
        beatsToJump = 0
        passedTime = engine.getValue(group, "beat_distance"),
        loopEnabled = engine.getValue(group, "loop_enabled");
    /*
    var bpm = engine.getValue(group, "file_bpm"),
        playposition = engine.getValue(group, "playposition"),
        duration = engine.getValue(group, "duration");
    */

    //DJCi500.slicerActive[deck] = value ? true : false;

    if (value) {
        DJCi500.slicerButton[deck] = index;
        //Maybe I need to update this (seems sometimes it does not work.)
        //DJCi500.slicerBeatsPassed[deck] = Math.floor((playposition * duration) * (bpm / 60.0));
        beatsToJump = (index * (domain / 8)) - ((DJCi500.slicerBeatsPassed[deck] % domain));
        beatsToJump -= passedTime;

        //activate the one-shot timer for the slip end.
        if (!DJCi500.slicerTimer[deck]){
            DJCi500.slicerTimer[deck] = true;
            var timer_ms = (1-passedTime)*60.0/engine.getValue(group, "bpm")*1000;

            //quality of life fix for not-precise hands or beatgrid
            // also good fix for really small timer_ms values.
            if ( (passedTime >= 0.8) &&
                //this is because while looping doing this thing on beat 8 break the flow.
                ((!loopEnabled) || (DJCi500.slicerBeatsPassed[deck] % domain) != (domain-1)) ) {
                timer_ms += 60.0/engine.getValue(group, "bpm")*1000;
            }

            engine.beginTimer( timer_ms,
                //"DJCi500.slicerTimerCallback("+group+")", true);
                function() {
                    //need to do this otherwise loop does not work on beat 8 because of slip.
                    if ((engine.getValue(group, "loop_enabled") == true)){
                        //on the wiki it says it returns an integer, but I tested and instead seems a Real value:
                        // But it does not work cuz the value does not relate to beat. they are samples.
                        //var endLoop = engine.getValue(group, "loop_end_position");
                        engine.setValue(group, "reloop_toggle", true); //false
                        engine.setValue(group, "slip_enabled", false);
                        //Aleatory behavior, probably because the slip does not always have completed before "returning"
                        //so I need to introduce a timer waiting the slip function to be completely resolved
                        engine.beginTimer( 2, function () {
                                var bpm_file = engine.getValue(group, "file_bpm"),
                                    playposition = engine.getValue(group, "playposition"),
                                    duration = engine.getValue(group, "duration");
                                /*
                                if (Math.floor((playposition * duration) * (bpm_file / 60.0)) > endLoop) {
                                    engine.setValue(group, "beatjump", -8);
                                }*/
                                engine.setValue(group, "reloop_toggle", true);},
                            true);
                    }
                    else {
                        engine.setValue(group, "slip_enabled", false);
                    }
                    DJCi500.slicerTimer[deck] = false;
                    DJCi500.slicerButton[deck] = -1;},
                true);
        }

        engine.setValue(group, "slip_enabled", true);

        //Because of Mixxx beatjump implementation, we need to deactivate the loop before jumping
        // also there is no "lopp_deactivate" and loop_activate false does not work.
        if (loopEnabled) {
            engine.setValue(group, "reloop_toggle", true);
        }
        engine.setValue(group, "beatjump", beatsToJump);
        //This sadly does not work.
        //engine.setValue(group, "loop_move", -beatsToJump);
        if (loopEnabled){
            engine.setValue(group, "reloop_toggle", true);
        }
        midi.sendShortMsg((0x96+deck), 0x20+index, 0x62);
    } //if value

};

//this below is connected to beat_active
DJCi500.slicerBeatActive = function(value, group, control) {
    // This slicer implementation will work for constant beatgrids only!
    var deck = parseInt(group.substring(8, 9)) - 1;
        bpm = engine.getValue(group, "file_bpm"),
        playposition = engine.getValue(group, "playposition"),
        duration = engine.getValue(group, "duration"),
        slicerPosInSection = 0,
        ledBeatState = false,
        domain = DJCi500.selectedSlicerDomain[deck];

    //this works.
    if (engine.getValue(group, "beat_closest") === engine.getValue(group, "beat_next")) {
        return;
    }

    DJCi500.slicerBeatsPassed[deck] = Math.floor((playposition * duration) * (bpm / 60.0));

    if (DJCi500.slicerActive[deck]){
        slicerPosInSection = Math.floor((DJCi500.slicerBeatsPassed[deck] % domain) / (domain / 8));
/*
        if (DJCi500.activeSlicerMode[deck] === DJCi500.slicerModes.loopSlice) {
            ledBeatState = false;
            if (((DJCi500.slicerBeatsPassed[deck] - 1) % domain) === (domain - 1) &&
                !DJCi500.slicerAlreadyJumped[deck] &&
                DJCi500.slicerPreviousBeatsPassed[deck] < DJCi500.slicerBeatsPassed[deck]) {
                engine.setValue(group, "beatjump", -domain);
                DJCi500.slicerAlreadyJumped[deck] = true;
            } else {
                DJCi500.slicerAlreadyJumped[deck] = false;
            }
        }
*/
        // PAD Led control:
        if (DJCi500.slicerButton[deck] != slicerPosInSection) {
            for (var i = 0; i < 8; i++) {
                active = ((slicerPosInSection == i) ? ledBeatState : !ledBeatState) ? 0x03 : 0x7F;
                midi.sendShortMsg((0x96+deck), 0x20+i, active);
            }
        } else {
            midi.sendShortMsg((0x96+deck), 0x20+DJCi500.slicerButton[deck], 0x62);
        }
    } else {
        DJCi500.slicerAlreadyJumped[deck] = false;
        DJCi500.slicerPreviousBeatsPassed[deck] = 0;
    }

};


/////
// Control knob
/*
//1: fare un altro timer (1 sec)
{
        //1: define which is the main deck:

        //A: Acquire the volume Faders
        //B: Acquire the crossfader.
        //Define the main deck:
        //cases:
        //only one deck playing
        if deck1
            if Deck2{
                if volume1 > volume2 + slack {
                    stateapp=deck1;
                }
                elseif volume2 > volume1 + slack
                stateapp=Deck
                else stateapp = 0
                //stessa cosa per il cross Faders

                se emntrambi 0 o differenti
                state undefined, prendi la più a fine
                altrimeti è lo stato.
            }
            else {
                state = deck1
            }
        else {
            state = deck2
        }
        //both deck playing
        //s
}
*/



DJCi500.shutdown = function() {
  //cleanup
  engine.stopTimer(DJCi500.FxLedtimer);

  //var controlsToFunctions = {'beat_active': 'DJCi500.slicerBeatActive'}
  //script.bindConnections('[Channel1]', controlsToFunctions, false);

  midi.sendShortMsg(0x90, 0x05, 0x00); //turn browser led off
	midi.sendShortMsg(0xB0, 0x7F, 0x7E);
};
