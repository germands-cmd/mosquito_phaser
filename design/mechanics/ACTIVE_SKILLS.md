# Active Abilities — Mechanics and Visual Design Specification

## 1. Objective

Design and prototype an active ability system for the existing mosquito game.

The purpose of this prototype is to evaluate whether directional key sequences, combined with temporary slow motion and powerful fly-swatter impacts, create an engaging gameplay mechanic.

This prototype must focus exclusively on active abilities. Blood, resource costs, passive upgrades, roguelike progression, and other upgrade systems are outside the scope of this implementation.

## 2. Core Gameplay Loop

The active ability system follows this sequence:

1. The player activates an equipped ability.
2. The game temporarily enters a slow-motion state.
3. A directional key sequence appears on screen.
4. The player must reproduce the sequence before the timer expires.
5. If the sequence is completed successfully, the ability becomes prepared.
6. The next fly-swatter impact triggers the ability's special effect.
7. After the effect resolves, the ability returns to its inactive state.

If the player enters an incorrect direction or the timer expires, the sequence fails and the ability has no effect. The player can continue playing normally and activate an ability again.

The ability must not trigger its effect immediately upon completing the sequence. Success prepares the effect for the next fly-swatter impact, making the player's next attack the payoff for completing the sequence.

## 3. Ability Activation and Input

### Activation

The player has two active ability slots, assigned to keyboard keys `1` and `2`.

Pressing the corresponding key begins the input sequence for that ability.

For the initial prototype, the player should only be able to prepare one ability at a time. Activating another ability while a sequence is active or an ability is already prepared should not be possible.

### Directional Sequence

The sequence consists of directional inputs using the arrow keys:

- Up
- Down
- Left
- Right

The player must enter the directions in the displayed order.

For the initial prototype, use a configurable sequence length, starting with four directional inputs. The sequence should be randomly generated for each activation.

The sequence must be clearly visible and easy to read. The current input should be visually distinguished from the remaining and already completed inputs, allowing the player to understand their progress immediately.

### Time Limit

The player has three seconds to complete the sequence.

The timer begins when the sequence appears and ends when the player either completes the sequence, enters an incorrect direction, or runs out of time.

Both the sequence length and the time limit should be configurable for future balancing.

### Slow Motion

When the sequence begins, the game should enter slow motion, reducing gameplay speed to approximately 5% of normal speed.

This slowdown should affect gameplay elements such as mosquito movement and other world simulation that normally advances over time.

The input timer must use real time rather than the slowed gameplay time. Otherwise, the effective duration of the sequence would increase substantially.

When the sequence ends, gameplay returns to normal speed, regardless of whether the player succeeds or fails.

The implementation should preserve the game's existing update behavior and avoid accumulating time-related errors when entering or leaving slow motion.

### Zoom

In order to create more feedback, when the sequence begins, a zoom in begins as well, going from normal zoom to 95-90% approx.

When the sequence ends, gameplays returns to normal zoom, regardless of whether the player succeeds or fails.

This zoom should zoom in and zoom out with a ease transition.

## 4. Ability States

The active ability system should use clearly defined states:

- **Ready:** The ability can be activated.
- **Entering Sequence:** The player is entering the directional sequence.
- **Prepared:** The sequence has been completed successfully, and the next fly-swatter impact will trigger the effect.
- **Executing Effect:** The special effect is being applied.
- **Failed:** The sequence was incorrect or the timer expired.

After a failure, the ability returns to the Ready state.

After a successful impact and effect resolution, the ability also returns to the Ready state.

At Entering Sequence state, player MUST BE invulnerable, in order to prevent being bitten by mosquitoes.

The system must prevent abilities from being activated repeatedly while they are already being executed or prepared.

## 5. Visual Design and Feedback

The active ability system should communicate its state through clear visual feedback without obstructing the main gameplay area.

### Sequence Interface

When an ability is activated:

- Display the directional sequence in a clearly visible interface element. Reveal each arrow symbol progressively, with a short delay between consecutive symbols. The total reveal duration should match the slow-motion transition duration, distributing the delay evenly across all symbols. For example, if the slow-motion transition lasts 100 ms and the sequence contains five arrows, reveal one arrow every 20 ms. This synchronization should make the sequence appear progressively as the game transitions into slow motion.
- Use recognizable arrow symbols rather than text labels.
- Highlight the next direction the player must enter.
- Visually mark correctly entered directions.
- Make incorrect inputs immediately noticeable.
- Display a countdown or progress indicator showing the remaining time.

The interface should remain readable during slow motion and should not cover important mosquito positions.

### Slow-Motion Feedback

The transition into slow motion should feel intentional rather than like a performance issue.

A subtle visual transition or brief screen effect can communicate that the player has entered the ability input phase.

When the sequence ends, the game should return smoothly to normal speed.

### Successful Sequence

When the player completes the sequence, provide a clear confirmation that the ability is prepared.

This may include a brief visual highlight around the ability indicator, a distinctive animation, or a change in the fly-swatter's appearance.

The player must be able to distinguish between successfully preparing an ability and merely finishing the input sequence.

### Failed Sequence

Failure should be communicated immediately through a short visual response, such as a red flash or a brief failure indicator.

The feedback should be clear without excessively interrupting the action.

### Prepared Ability

While an ability is prepared, its interface indicator should remain visibly active until the next fly-swatter impact triggers it.

The visual state must not disappear before the effect is used, and the ability must not trigger on an unrelated event.

### Ability HUD

The player's equipped active abilities should be displayed in the HUD through a dedicated UI element for each ability, just above the Swats and Bites UI section.

Each element should display the corresponding ability icon, allowing the player to identify which abilities are equipped and assigned to each activation key (1 and 2).

Since custom icons are not yet available, use a simple placeholder symbol for each ability.

The UI should also communicate the current state of each ability, particularly when it is being activated, successfully prepared, or ready to use again.

## 6. Ability Effects

The prototype should support multiple effects through a shared active ability system. Each ability should define its own effect while reusing the same activation, sequence, timing, preparation, and execution logic.

### Ability A: Pressure Bomb

**Concept:** The next successful fly-swatter impact produces an expanding shockwave around the impact location.

**Gameplay behaviour:**

- The player completes the directional sequence.
- The ability becomes prepared.
- The player hits with the fly-swatter.
- The impact triggers an expanding shockwave.
- Mosquitoes within the shockwave radius receive damage or are eliminated according to the existing damage rules.
- The effect ends after the shockwave finishes expanding.

**Visual behaviour:**

The initial impact should produce a strong visual burst and screen-shake, followed by an expanding circular wave.

The wave should be visually distinct from the ordinary fly-swatter impact and should communicate its area of effect clearly.

The effect should emphasize the feeling of a powerful, exaggerated cartoon impact.

### Ability B: Reverse Transfusion

**Concept:** The next fly-swatter impact triggers a chain of blood-like energy beams that jump between nearby mosquitoes.

**Gameplay behaviour:**

- The player completes the directional sequence.
- The ability becomes prepared.
- The player hits a mosquito with the fly-swatter.
- The initial target becomes the first point in a chain.
- The effect propagates to nearby mosquitoes, applying damage according to the existing damage rules.
- Propagation ends when no valid targets remain or a predefined maximum number of jumps is reached.

The initial implementation should use a configurable maximum number of jumps, maximum distance of jump, and a clear rule preventing the effect from repeatedly selecting the same target.

The jump never should go out of the screen, always should target mosquitoes visibles for the player.

If the impact does not hit a initial mosquito, the chain should starts anyways in the nearest mosquito.

**Visual behaviour:**

Visible beams should connect successive targets, making the propagation order understandable.

The effect should be fast, readable, and visually satisfying, with the impact initiating a short chain reaction across multiple mosquitoes.

Each chain impact should be charged of blood particles and screen-shake.

These two abilities are examples for validating the system architecture. The input system should not depend on either effect specifically.

## 7. Fly-Swatter Integration

The active ability system must integrate with the existing fly-swatter attack.

A prepared ability should activate only when the player successfully hits a valid target with the fly-swatter.

The system must distinguish between a valid impact and an attack that hits nothing.

For the initial prototype, if the player misses, the ability remains prepared until a valid hit occurs. This behaviour should be configurable if testing indicates that consuming the ability on a miss would be preferable.

The special effect should receive the impact position and any other relevant information from the fly-swatter attack.

Ability effects must not interfere with the normal fly-swatter animation or prevent the player from continuing to attack after the effect resolves.

## 8. Technical Design Requirements

Before implementation, inspect the existing project to identify:

- How player input is currently handled.
- How fly-swatter attacks and collision detection work.
- How mosquitoes receive damage and are eliminated.
- How game time, animations, and movement updates are managed.
- How the current interface is structured.
- Where the Swats and Bites UI section are implemented.

The active ability system should integrate with these existing systems rather than duplicating their functionality.

The implementation plan should separate the following responsibilities:

- Ability activation and state management.
- Directional sequence generation and validation.
- Sequence timer and slow-motion management.
- Prepared ability tracking.
- Fly-swatter impact detection.
- Ability-specific effect execution.
- Visual and interface feedback.

Ability-specific effects should be implemented independently of the sequence input logic so that additional abilities can be introduced without duplicating the entire activation system.

All relevant values, including sequence length, input duration, slow-motion scale, shockwave radius, and maximum chain jumps, should be easy to adjust.

## 9. Testing and Acceptance Criteria

The implementation should be considered functional when the following conditions are met:

1. The player can activate an ability using its assigned keyboard key.
2. A directional sequence appears and can be completed using the arrow keys.
3. The sequence is successfully validated when all directions are entered correctly and in order.
4. Incorrect input and time expiration both cause failure.
5. Slow motion and zoom begins when the sequence starts and ends when the sequence resolves.
6. The input timer continues to operate correctly during slow motion.
7. Successful completion prepares the ability without immediately triggering its effect.
8. The next valid fly-swatter impact triggers the prepared effect.
9. The Pressure Bomb affects mosquitoes within its configured radius.
10. Reverse Transfusion propagates between valid targets without repeatedly selecting the same mosquito.
11. Ability state indicators correctly communicate activation, success, failure, preparation, and execution.
12. After the effect resolves, the player can activate the ability again.
13. The system does not become stuck in slow motion or remain in an invalid ability state after success, failure, or interrupted gameplay.

## 10. Scope and Implementation Planning

At this stage, do not implement the system immediately.

First, inspect the existing project and produce an implementation plan describing:

- The current systems that need to be reused or modified.
- The components or scripts that need to be created or changed.
- The proposed ability state flow.
- How zoom, slow motion and the input timer will interact.
- How prepared abilities will connect to fly-swatter impacts.
- How the two example effects will be implemented.
- The order of implementation and the tests required at each stage.
- Any uncertainties or technical risks discovered during inspection.

The plan should prioritize a functional prototype over architectural complexity. Avoid introducing unrelated mechanics, resource systems, upgrade progression, or additional gameplay features.

# Version 1.1 of Active Abilities

_Note:_ Just for convenience, I am going to call "Inputs" to the arrows, and "Sequence" to the inputs sequence.

- The input sequence container is centered in the center horizontally, but in the top vertically. This container must be in the center vertically.
- Right now, the inputs in the sequence appear just if the player presses the previous input successfully. All the inputs must be shown in the screen at once, but appear with a small delay each one.
- Arrow keys are uncomfortable to press after pressing 1 or 2 keys. So, instead of using arrow keys for the inputs, now keys used are going to be: "Q", "W", "E" and "R". Same mechanics, but different keys.
- **Visual Design for Keycaps**: Inputs display as physical 3D arcade-style keycaps labeled `[ Q ]`, `[ W ]`, `[ E ]`, `[ R ]` with tactile bevels and drop-shadows.
- **Punch Feedback Animation**: When the player enters a correct key input, the corresponding keycap performs a punchy scale bounce (`1.2 -> 1.0`) with bright flash before transitioning to green, offering immediate tactile confirmation.
- **Click Suppression**: Fly-swatter strikes via mouse clicks are suppressed while in `ENTERING_SEQUENCE` to avoid accidental clicks and keep full focus on typing.
- **Sequence Context Header**: Header displays `"SEQUENCE: [ Q - W - E - R ]"`.
- **Bullet-Time Audio Damping (Slow Motion Audio)**: During the sequence input phase, all active mosquito buzzing sounds progressively decrease in volume by 95% and drop in pitch/low-pass cutoff frequency over a smooth transition (bullet-time effect). When the sequence ends (success or failure), audio volume and pitch progressively restore to normal levels.
- **Independent Camera Zoom & UI Pinning**: The game camera zooms in slightly (~1.08x) toward the gameplay action/background with an ease transition. All UI elements (sequence overlay, ability HUD, and game score banner) remain visually unzoomed (pinned at 1.0x scale in screen space) throughout the zoom transition.

# Version 1.2 of Active Abilities
