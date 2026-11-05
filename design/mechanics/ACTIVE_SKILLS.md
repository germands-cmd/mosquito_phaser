# Active Abilities — Mechanics and Visual Design Specification

## 1. Objective

Design and prototype an active ability system for the existing mosquito game.

The purpose of this system is to provide automatic active-ability effects driven by fly-swatter impacts and cooldowns, while reserving manual activation for the stress/frenzy mode.

This prototype must focus exclusively on active abilities. Blood, resource costs, passive upgrades, roguelike progression, and other upgrade systems are outside the scope of this implementation.

## 2. Core Gameplay Loop

The active ability system follows this sequence:

1. The player attacks with the fly-swatter.
2. The system registers a valid impact and updates the normal hit/stress systems.
3. Each ability independently checks its activation rule.
4. When an ability is due, the current impact triggers its special effect.
5. After the effect resolves, the ability waits for its next impact threshold or cooldown.

Pressure Bomb activates on every third valid impact; the third impact is the one that triggers it. Reverse Transfusion becomes eligible for the next valid impact once its two-second cooldown has elapsed. These rules are automatic and do not require pressing an ability key.

## 3. Ability Activation and Input

### Automatic activation

The two active abilities use independent automatic activation rules:

- **Pressure Bomb:** activates on every third valid fly-swatter impact. The impact counter is consumed by the triggering impact and continues counting toward the next activation.
- **Reverse Transfusion:** uses a two-second cooldown. Once the cooldown has elapsed, the next valid fly-swatter impact activates it. The cooldown is measured in real time and starts after the ability effect resolves.

Keys `1` and `2` are not used to activate abilities in normal mode.

### Stress and frenzy activation

Pressing `SPACE` while the stress gauge is full consumes the charge and enters frenzy mode. During frenzy, every valid impact activates **all** abilities simultaneously, ignoring both the Pressure Bomb impact requirement and the Reverse Transfusion cooldown. Frenzy does not empower ability statistics such as area, jump count, or jump distance; it only removes the normal activation restrictions.

### Directional Sequence (reserved)

The directional sequence system is not part of normal active-ability activation. Its internal states and UI may remain available for the future finishing-move mechanic, but pressing an ability key must not start a sequence during ordinary gameplay.

The sequence timer, slow motion, and zoom are reserved for the future finishing-move mechanic and must not run when automatic abilities trigger.

## 4. Ability States

The active ability system should use clearly defined states:

- **Ready:** The ability is available to satisfy its automatic activation rule.
- **Cooldown:** The ability is waiting before it can respond to another valid impact.
- **Executing Effect:** The special effect is being applied.
- **Frenzy Active:** Frenzy is active and the ability responds to every valid impact.

An ability must not trigger twice for the same impact. During frenzy, the manager may dispatch the same valid impact to every ability that can execute it.

## 5. Visual Design and Feedback

The active ability system should communicate its state through clear visual feedback without obstructing the main gameplay area.

### Sequence Interface

When the future finishing-move sequence is activated:

- Display the directional sequence in a clearly visible interface element. Reveal each arrow symbol progressively, with a short delay between consecutive symbols. The total reveal duration should match the slow-motion transition duration, distributing the delay evenly across all symbols. For example, if the slow-motion transition lasts 100 ms and the sequence contains five arrows, reveal one arrow every 20 ms. This synchronization should make the sequence appear progressively as the game transitions into slow motion.
- Use recognizable arrow symbols rather than text labels.
- Highlight the next direction the player must enter.
- Visually mark correctly entered directions.
- Make incorrect inputs immediately noticeable.
- Display a countdown or progress indicator showing the remaining time.

The interface should remain readable during slow motion and should not cover important mosquito positions.

### Slow-Motion Feedback

The transition into slow motion should feel intentional rather than like a performance issue when the future finishing-move sequence is used. Automatic ability effects must not start this interface or slow gameplay.

A subtle visual transition or brief screen effect can communicate that the player has entered the ability input phase.

When the sequence ends, the game should return smoothly to normal speed.

### Ability HUD

The player's equipped active abilities should be displayed as two square outer containers with the ability icon inside a smaller square inner container.

The outer container remains visible so its border color can communicate the ability state. The HUD must not display the activation key, ability name, or a text label such as `READY`; only the icon is shown inside the inner square.

The stress bar is positioned behind the health bar, slightly larger and higher, so it forms a visible stress-colored border around the health bar. The ability containers are positioned above the health/stress bars with a small coherent margin between both groups.

The stress bar fills and changes appearance when full. Pressing `SPACE` starts frenzy, and the UI should clearly distinguish the active frenzy state from a merely full stress gauge.

The progress bar inside each ability container represents automatic availability:
Pressure Bomb fills according to its three-impact cycle, while Reverse Transfusion
fills during its two-second cooldown. The bar is white and flashes the outer border
when the ability becomes available. It is not a frenzy-duration indicator.

## 6. Ability Effects

The prototype should support multiple effects through a shared active ability system. Each ability should define its own effect while reusing the same activation, sequence, timing, preparation, and execution logic.

### Ability A: Pressure Bomb

**Concept:** Every third valid fly-swatter impact produces an expanding shockwave around the impact location.

**Gameplay behaviour:**

- The valid-impact counter reaches three.
- The third impact triggers an expanding shockwave.
- Mosquitoes within the shockwave radius receive damage or are eliminated according to the existing damage rules.
- The effect ends after the shockwave finishes expanding.

**Visual behaviour:**

The initial impact should produce a strong visual burst and screen-shake, followed by an expanding circular wave.

The wave should be visually distinct from the ordinary fly-swatter impact and should communicate its area of effect clearly.

The effect should emphasize the feeling of a powerful, exaggerated cartoon impact.

### Ability B: Reverse Transfusion

**Concept:** After a two-second cooldown, the next valid fly-swatter impact triggers a chain of blood-like energy beams that jump between nearby mosquitoes.

**Gameplay behaviour:**

- The ability's cooldown has elapsed.
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

Automatic abilities should activate only from a valid fly-swatter impact, unless frenzy is active. In frenzy, the same valid impact is dispatched to every ability regardless of its normal requirement or cooldown.

The system must distinguish between a valid impact and an attack that hits nothing.

Missed swats do not advance the Pressure Bomb counter, do not start or reset the Reverse Transfusion cooldown, and do not trigger abilities.

Each ability effect applies exactly one point of damage per affected mosquito through
the normal damage system. Effects must not kill a mosquito directly.

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

1. Pressure Bomb triggers on the third valid impact and every third valid impact thereafter.
2. Reverse Transfusion triggers on the next valid impact after its two-second cooldown.
3. Missed swats do not advance or trigger either ability.
4. Pressing `SPACE` while stress is full enters frenzy and consumes the stress charge.
5. Every valid impact during frenzy triggers both abilities, ignoring impact requirements and cooldowns.
6. Frenzy does not change ability statistics such as radius, jump count, or jump distance.
7. The ability HUD shows only square icon containers, without key labels, names, or readiness text.
8. The stress bar is rendered behind and slightly above/wider than the health bar.
9. The ability containers are positioned below the health/stress bars with a coherent gap.
10. The system does not become stuck in frenzy or remain in an invalid ability state after the frenzy duration ends.

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
