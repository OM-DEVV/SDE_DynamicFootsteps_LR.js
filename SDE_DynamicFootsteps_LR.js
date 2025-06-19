/*:
 * @pluginname SDE_DynamicFootsteps_LR
 * @author Your Name (Senior Developer)
 * @version 2.4.0
 * @target MZ
 * @url https://your-plugin-repo.com
 * @orderAfter VisuMZ_0_CoreEngine
 * @orderAfter mz3d-jump-mod
 *
 * @help
 * SDE_DynamicFootsteps_LR.js
 * ============================================================================
 *
 * This plugin provides a robust system for playing dynamic, alternating
 * Left/Right footstep sounds based on the terrain tag the player is on.
 *
 * --- VERSION 2.4.0 UPDATE ---
 * - Added a new "Play Condition" system to SoundConfigLR. Each sound can now
 *   be configured to only play if a specified Game Variable meets a certain
 *   conditional value (e.g., Variable 1 >= 10). This allows for dynamic
 *   sound suppression or activation based on game state (e.g., "stealth mode").
 *
 * --- VERSION 2.3.0 UPDATE ---
 * - Fixed a timing issue where a footstep sound could play at the start
 *   of a jump if movement and jump keys were pressed on the same frame.
 * - Added a "Jump Input Symbol" parameter for compatibility. This should
 *   match the jump symbol used in your jump plugin (e.g., mz3d-jump-mod).
 *
 * --- HOW TO USE ---
 * 1. Place this plugin AFTER your jump/3D plugins in the Plugin Manager.
 * 2. NEW: Set the "Jump Input Symbol" parameter to match the input symbol
 *    defined in your jump plugin (the default is 'jump').
 * 3. Configure Terrain Tags, sound files, and other parameters as before.
 * 4. NEW: Within each sound configuration (Default or Terrain-specific),
 *    you can now enable a "Play Condition" to make the sound play only
 *    when a specified game variable meets a set value criteria.
 *
 * ============================================================================
 *
 * @param masterSwitchId
 * @text Master Switch
 * @desc If this switch is ON, the plugin is active. If OFF, it does nothing. Set to 0 to always be active.
 * @type switch
 * @default 0
 *
 * @param volumeVariableId
 * @text Volume Control Variable
 * @desc Game variable ID to control master footstep volume (0-100). Set to 0 to disable.
 * @type variable
 * @default 0
 *
 * @param jumpInputSymbol
 * @text Jump Input Symbol
 * @desc The input symbol for jumping (e.g., 'jump', 'ok'). MUST match your jump plugin's setting to prevent sounds on jump start.
 * @type string
 * @default jump
 *
 * @param terrainSoundMap
 * @text Terrain Sound Map
 * @desc Maps terrain tags to specific L/R footstep sound pairs.
 * @type struct<TerrainSoundLR>[]
 * @default []
 *
 * @param defaultFootsteps
 * @text Default Footsteps (L/R)
 * @desc The L/R sound pair to play when the terrain tag is 0 or not found.
 * @type struct<SoundConfigLR>
 * @default {"nameLeft":"","nameRight":"","volume":"90","pitch":"100","playConditionEnabled":"false","playConditionVariableId":"0","playConditionOperator":"==","playConditionValue":"0"}
 *
 * @param pitchVariation
 * @text Pitch Variation
 * @desc The maximum random pitch change (+/-). 8 means pitch can vary from 92 to 108.
 * @type number
 * @min 0
 * @default 8
 *
 * @param volumeVariation
 * @text Volume Variation
 * @desc The maximum random volume change (+/-). 5 means volume can vary by up to 5 points.
 * @type number
 * @min 0
 * @default 5
 *
 */

/*~struct~TerrainSoundLR:
 * @param terrainTag
 * @text Terrain Tag ID
 * @desc The terrain tag number (1-7) to link this sound to.
 * @type number
 * @min 1
 * @max 7
 * @default 1
 *
 * @param sound
 * @text L/R Sound Configuration
 * @desc The sound effect pair to play for this terrain tag.
 * @type struct<SoundConfigLR>
 * @default
 */

/*~struct~SoundConfigLR:
 * @param nameLeft
 * @text Left Foot Sound
 * @desc Sound file for the LEFT footstep.
 * @type file
 * @dir audio/se/
 * @default
 *
 * @param nameRight
 * @text Right Foot Sound
 * @desc Sound file for the RIGHT footstep.
 * @type file
 * @dir audio/se/
 * @default
 *
 * @param volume
 * @text Base Volume
 * @desc The base volume for the sound (0-100).
 * @type number
 * @min 0
 * @max 100
 * @default 90
 *
 * @param pitch
 * @text Base Pitch
 * @desc The base pitch for the sound (50-150). 100 is normal.
 * @type number
 * @min 50
 * @max 150
 * @default 100
 *
 * @param playConditionEnabled
 * @text Play Condition Enabled
 * @desc If true, the sound will only play if a specified variable meets a condition.
 * @type boolean
 * @default false
 *
 * @param playConditionVariableId
 * @text Condition Variable ID
 * @desc The ID of the game variable to check. Set to 0 to disable if condition is enabled.
 * @type variable
 * @default 0
 *
 * @param playConditionOperator
 * @text Condition Operator
 * @desc The comparison operator for the variable value.
 * @type select
 * @option = (Equal To)
 * @value ==
 * @option != (Not Equal To)
 * @value !=
 * @option > (Greater Than)
 * @value >
 * @option < (Less Than)
 * @value <
 * @option >= (Greater Than or Equal To)
 * @value >=
 * @option <= (Less Than or Equal To)
 * @value <=
 * @default ==
 *
 * @param playConditionValue
 * @text Condition Value
 * @desc The value to compare the variable against.
 * @type number
 * @default 0
 */

(() => {
  'use strict';

  const PLUGIN_NAME = 'SDE_DynamicFootsteps_LR';
  const params = PluginManager.parameters(PLUGIN_NAME);

  const masterSwitchId = Number(params.masterSwitchId || 0);
  const volumeVariableId = Number(params.volumeVariableId || 0);
  const jumpInputSymbol = String(params.jumpInputSymbol || '');
  const pitchVariation = Number(params.pitchVariation || 8);
  const volumeVariation = Number(params.volumeVariation || 5);

  const parseSoundConfigLR = (jsonString) => {
    if (!jsonString) return null;
    const config = JSON.parse(jsonString);
    return {
      nameLeft: String(config.nameLeft || ''),
      nameRight: String(config.nameRight || ''),
      volume: Number(config.volume || 90),
      pitch: Number(config.pitch || 100),
      // --- New Play Condition Parameters ---
      playConditionEnabled: String(config.playConditionEnabled || 'false') === 'true',
      playConditionVariableId: Number(config.playConditionVariableId || 0),
      playConditionOperator: String(config.playConditionOperator || '=='),
      playConditionValue: Number(config.playConditionValue || 0)
      // --- End New Parameters ---
    };
  };

  const defaultSoundPair = parseSoundConfigLR(params.defaultFootsteps);
  const terrainSoundMap = new Map();
  if (params.terrainSoundMap) {
    const terrainConfigs = JSON.parse(params.terrainSoundMap);
    for (const configStr of terrainConfigs) {
      const config = JSON.parse(configStr);
      const tag = Number(config.terrainTag);
      const soundConfig = parseSoundConfigLR(config.sound);
      if (tag > 0 && soundConfig && (soundConfig.nameLeft || soundConfig.nameRight)) {
        terrainSoundMap.set(tag, soundConfig);
      }
    }
  }

  const _Game_System_initialize = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this._isNextFootLeft = true;
  };

  const _Game_Player_increaseSteps = Game_Player.prototype.increaseSteps;
  Game_Player.prototype.increaseSteps = function() {
    _Game_Player_increaseSteps.call(this);
    if (this.canPlayFootstepSound()) {
      const terrainTag = this.terrainTag();
      const soundConfig = terrainSoundMap.get(terrainTag) || defaultSoundPair;
      if (soundConfig) {
        this.playAlternatingFootstep(soundConfig);
      }
    }
  };

  /**
   * @MODIFIED v2.3.0
   * This function now predictively checks for jump input on the same frame.
   */
  Game_Player.prototype.canPlayFootstepSound = function() {
    // --- PREDICTIVE JUMP CHECK ---
    // If the jump input is triggered on the same frame as a move,
    // prioritize the jump and suppress the footstep sound.
    if (jumpInputSymbol && Input.isTriggered(jumpInputSymbol)) {
      return false;
    }

    // --- EXISTING JUMP/FALL CHECK ---
    // If the mv3d_sprite object exists and its 'falling' property is true,
    // the player is already airborne.
    if (this.mv3d_sprite && this.mv3d_sprite.falling) {
      return false;
    }

    // --- ORIGINAL CHECKS ---
    if (masterSwitchId > 0 && !$gameSwitches.value(masterSwitchId)) {
      return false;
    }

    return this.isNormal() && !this.isMoveRouteForcing() && !$gameMap.isEventRunning();
  };

  Game_Player.prototype.playAlternatingFootstep = function(config) {
    const isLeft = $gameSystem._isNextFootLeft;
    const soundName = isLeft ? config.nameLeft : config.nameRight;

    // --- NEW: Play Condition Check ---
    if (config.playConditionEnabled) {
      const variableId = config.playConditionVariableId;
      if (variableId === 0) { // If condition enabled but no variable specified, default to not playing.
          $gameSystem._isNextFootLeft = !isLeft; // Still alternate foot
          return;
      }
      const variableValue = $gameVariables.value(variableId);
      const conditionValue = config.playConditionValue;
      const operator = config.playConditionOperator;

      let conditionMet = false;
      switch (operator) {
        case '==':
          conditionMet = variableValue === conditionValue;
          break;
        case '!=':
          conditionMet = variableValue !== conditionValue;
          break;
        case '>':
          conditionMet = variableValue > conditionValue;
          break;
        case '<':
          conditionMet = variableValue < conditionValue;
          break;
        case '>=':
          conditionMet = variableValue >= conditionValue;
          break;
        case '<=':
          conditionMet = variableValue <= conditionValue;
          break;
        default:
          conditionMet = false; // Should not happen with select type, but good for robustness
      }

      if (!conditionMet) {
        // Condition not met, so don't play the sound.
        // Importantly, still alternate the foot for the next step to maintain L/R sequence.
        $gameSystem._isNextFootLeft = !isLeft;
        return;
      }
    }
    // --- End Play Condition Check ---

    if (!soundName) {
      $gameSystem._isNextFootLeft = !isLeft; // Still alternate foot even if no sound is assigned
      return;
    }

    const se = {
      name: soundName,
      pan: 0
    };
    const pitchRand = (Math.random() - 0.5) * 2 * pitchVariation;
    se.pitch = Math.round(config.pitch + pitchRand);
    const volumeRand = (Math.random() - 0.5) * 2 * volumeVariation;
    let finalVolume = config.volume + volumeRand;

    if (volumeVariableId > 0) {
      const masterVolumePercent = $gameVariables.value(volumeVariableId);
      const masterVolumeMultiplier = Math.max(0, Math.min(100, masterVolumePercent)) / 100;
      finalVolume *= masterVolumeMultiplier;
    }
    se.volume = Math.round(finalVolume);
    se.pitch = Math.max(50, Math.min(150, se.pitch));
    se.volume = Math.max(0, Math.min(100, se.volume));

    AudioManager.playSe(se);
    $gameSystem._isNextFootLeft = !isLeft;
  };

})();