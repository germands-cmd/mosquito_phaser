# Implementation Planning: Stress and Frenzy System

## Objective

Adapt the existing ability system to support the new stress and frenzy mechanics while preserving and adapting the current internal ability states and architecture wherever practical.

At this stage, inspect the project and analyze how the changes should be implemented. Do not modify any code or project files.

The existing button-sequence system must be preserved for reuse in a second stage, when the finishing move is implemented. Do not implement the finishing move now.

### 1. General Ability Behavior

There are two abilities, activated with keys 1 and 2. Each ability has its own independent cooldown.

**Normal behavior: stress below 100%**

1. The player presses the key for an available ability.
2. The ability enters its prepared state.
3. The next valid mosquito hit triggers the ability's effect exactly once.
4. Once the effect has finished, that ability's cooldown begins.

If one ability is already prepared, pressing the key for the other ability does absolutely nothing: it does not cancel, replace, or queue the other ability.

If one ability is on cooldown, the other ability can still be activated if it is available. Cooldowns are independent.

**Stress system**

Stress is an internal value ranging from 0 to 100. The numeric value does not need to be visible to the player; it is represented by a stress bar.

Confirmed sources of stress:

- Swatting mosquitoes.
- Chaining valid hits without missing, using a streak multiplier.
- Receiving mosquito bites.

Streak rules:

- Each valid hit increases the streak.
- The streak multiplies the stress gained from swatting mosquitoes.
- Missing a swat resets the streak to zero.
- Mosquito bites generate less stress than swatting a mosquito.
- Stress gained from bites is not affected by the streak multiplier.

When stress reaches 100, it stays full indefinitely until the player activates an ability.

_Important: while frenzy is active, the player cannot gain or build up another frenzy_. Stress must not be gained from swats or bites during the frenzy, and no new frenzy charge can accumulate during this period.

**Frenzy behavior: stress at 100%**

1. The player activates either available ability.
2. The full stress charge is consumed progressively throughout five seconds, and frenzy starts immediately when the ability key is pressed.
3. The ability becomes active and its effect can trigger repeatedly during the five-second frenzy.
4. Every valid hit during those five seconds triggers the ability's empowered effect once.
5. The player can trigger the effect as many times as they manage valid hits during the frenzy.
6. When the five seconds end, frenzy ends, the ability's prepared/active state is cleared, and that ability enters cooldown, regardless of how many times it hit.

_The empowered effect must not be consumed by the first hit_. Unlike normal behavior, the ability remains active throughout the frenzy and its empowered effect repeats on every valid hit until the five-second timer expires.

If the player does not land any hits during the five seconds, the effect does not trigger and the ability still enters cooldown when frenzy ends.

While frenzy is active, the other ability cannot be activated. Pressing its key does absolutely nothing.

**Empowerment during frenzy**

Initial values:

- Frenzy duration: 5 seconds.
- Empowerment to compatible numeric ability parameters: +50%.
- Attack speed increase: initially proposed as +25%, subject to inspecting the current parameter and recommending how to adjust it.

AntiGravity should inspect each ability and determine which numeric parameters can be meaningfully empowered. For example:

- An expanding shockwave ability could increase its area or radius.
- An ability that chains blood beams between mosquitoes could increase maximum jump distance and the number of jumps.

Do not blindly multiply every parameter. Review integer parameters, limits, timings, and other values to determine an appropriate and consistent application of the increase. Avoid changing parameters where empowerment would not make sense.

During frenzy, the stress bar drains visually from 100 to 0, synchronized with the five-second timer. When frenzy ends, stress remains at zero.

### 2. Initial Stress Formula Proposal

Exact values have not been finalized. The following is a starting proposal to evaluate and test, not a definitive requirement.

**Proposed starting values**

- Valid hit against a mosquito: +6 base stress.
- Mosquito bite received: +3 stress.
- Streak multiplier: increase by +0.1x per consecutive hit after the first, capped at 2.0x.

Proposed formula for stress gained from a hit:

`stress gained = base stress × streak multiplier`

Example multiplier progression:

- First hit in a streak: 1.0x.
- Second consecutive hit: 1.1x.
- Third consecutive hit: 1.2x.
- Continue increasing up to a maximum of 2.0x.

Bites always grant the proposed fixed amount and do not use the streak multiplier.

Total stress must never exceed 100. These values can be adjusted after testing the actual game pacing. AntiGravity should assess whether this proposal fits the current code and identify anything worth testing or adjusting, without modifying the project.

During frenzy, do not award stress from hits or bites and do not allow a new frenzy charge to accumulate.

### 3. Existing Internal States and Architecture

Before proposing changes, inspect the current ability code and its internal states.

Analyze how the current project represents:

- Ability availability.
- The prepared/active ability state.
- Effect execution on a valid hit.
- Cooldown.
- The existing button-sequence system.
- Hit, missed-swat, and bite events.
- Attack speed and its current parameters.

Determine how to adapt the existing states to support both behaviors:

- **Normal**: trigger the effect once on the next valid hit.
- **Frenzy**: trigger the empowered effect repeatedly on every valid hit during the five-second window.

Avoid creating unnecessary parallel systems or rewriting reusable code. Keep cooldowns independent for each ability. Identify potential conflicts between current states and the new behavior, but do not make changes.

Preserve the button-sequence system for the second stage. Do not remove it or implement the finishing move during this stage.

### 4. UI and Visual/Audio Feedback

**When stress reaches 100%**

- The stress bar should appear completely full and change to a brighter color.
- The borders of the ability icons should glow color to indicate that the charge is ready.
- Add a brief UI pulse or visual effect to communicate that the bar has reached its maximum.
- Add a sound effect when the bar fills.

The full-charge state remains visually indicated until the player activates an ability.

**During frenzy**

Feedback must be clearly distinct from the full-charge state:

- Potential color frame or lighting around the screen.
- Potential additional particles or visual effects.
- A duration indicator around the active ability's icon, synchronized with the five-second timer.

Abilities that are not active must not display borders or effects during frenzy. When frenzy starts, the full-charge feedback should transition to the distinct frenzy feedback.

AntiGravity should inspect the existing UI and visual/audio assets to determine how these changes could fit, without modifying anything yet.

### 5. Configuration

Inspect how abilities and gameplay parameters are currently configured. If it fits the existing architecture, recommend a way to configure:

- Maximum stress threshold (100).
- Base stress per hit.
- Stress per bite.
- Streak multiplier increment and cap.
- Frenzy duration (5 seconds).
- Ability parameter empowerment (+50%).
- Attack speed increase (initial proposal: +25%).
- Individual ability cooldowns.

Do not introduce a new configuration layer or redesign the architecture just to make these values configurable. Evaluate the patterns already used by the project first.

### 6. Scenarios to Consider

- Activate an ability with stress below 100 and land no hits: the ability remains prepared until the next valid hit, following the existing normal behavior.
- Activate an ability with stress at 100 and land no hits during frenzy: when the five seconds end, the pending effect is discarded and cooldown begins.
- Land multiple valid hits during frenzy: each hit triggers the empowered effect once.
- Frenzy ends: the effect can no longer trigger, and the ability enters cooldown.
- Press the other ability's key while an ability is prepared or frenzy is active: nothing happens.
- Attempt to activate an ability that is on cooldown: that ability does not activate, but the other ability can activate if available and no other ability is prepared and no frenzy is active.
- Receive a bite in any state: add stress without the streak multiplier, respecting the maximum of 100, except during frenzy, when stress gain is disabled.
- Miss a swat: reset the streak to zero.
- During frenzy, hit mosquitoes repeatedly: trigger the empowered ability effect on each valid hit, without consuming the ability after the first hit.
- During frenzy, receive bites or swat mosquitoes: do not gain stress or accumulate another frenzy charge.
