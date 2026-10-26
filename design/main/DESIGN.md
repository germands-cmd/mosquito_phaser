DESIGN.md — Mosquito
1. Project Overview

Project name: Mosquito
Project type: 2D first-person survival / action game prototype
Engine: Phaser 3
Platform: Desktop browser
Primary input: Mouse
Primary gameplay mechanic: Directional audio anticipation
Prototype priority: Functional gameplay over polished assets

High concept

Mosquito is a 2D first-person game in which the player must protect their exposed legs from small, fast mosquitoes by smashing them with a fly swatter.

The player views their own legs from above, sitting or lying down, with their thighs in the foreground and their feet toward the top of the screen. Mosquitoes approach from the left, right, and top edges of the screen, diving toward exposed skin.

Mosquitoes are small and fast enough that relying on visual reflexes alone should not be sufficient. The player must listen carefully to their buzzing to anticipate the direction of an incoming attack, position the fly swatter, and strike at the right moment.

The core design principle is that the player should hear the threat before they can reliably react to it visually.

The prototype must make this mechanic understandable, playable, and testable without requiring professional artwork.

2. Design Pillars
2.1 Audio-first gameplay

Directional buzzing is the primary warning system. Players should learn to associate the sound's spatial position and increasing intensity with the direction and urgency of an incoming attack.

2.2 Small, fast, threatening enemies

Mosquitoes should be visually small and move quickly. Their speed and size create pressure, but their attacks must remain fair because the player receives an audio warning before each attack.

2.3 Physical, precise interaction

The fly swatter follows the mouse. Its shadow communicates the exact impact location. Players must move the swatter toward an approaching mosquito and click to smash it.

2.4 Readable visual composition

The player's legs remain the central visual reference. Mosquitoes must be visible against the background without becoming disproportionately large.

2.5 Prototype-first development

Use simple shapes, placeholder sprites, generated audio, and basic animations. Implement and validate the complete gameplay loop before investing in detailed artwork.

3. Camera and Scene Composition

The game uses a fixed 2D top-down perspective representing the player's first-person view of their own legs.

Screen layout
The player's thighs occupy the lower foreground.
The legs extend toward the top of the screen.
The feet are visible near the upper portion of the screen.
A worn rug and wooden floor provide the environment.
The left, Top-Left, right, Top-Right, and top edges are valid mosquito approach directions.
The bottom edge is reserved for the player and must never be used as a mosquito spawn direction.

The camera does not move during the initial prototype.

Placeholder implementation

Create the scene using Phaser Graphics, basic shapes, and simple procedural textures if needed.

Represent the legs with two skin-colored shapes and use darker outlines and shadows to communicate volume. Use simple polygons or textured rectangles for the rug and wooden floor.

These placeholders should establish the intended composition, not attempt to simulate final art.

4. Visual Direction

The intended style is a gritty, hand-drawn comic-book aesthetic.

Art direction
Bold, irregular outlines.
Textured shading.
Muted, earthy colors.
Slightly exaggerated, cartoonish proportions.
A worn rug and wooden floor.
Mosquitoes with recognizable wings, legs, bodies, and forward-pointing proboscises.
Mosquito design

Mosquitoes are seen directly from above.

Each mosquito should have:

A small, elongated body.
Two visible wings.
Thin legs.
A clearly visible proboscis pointing in the direction of travel.
A dark outline that separates it from the environment.

Use simple custom-drawn shapes or placeholder sprites. A mosquito should remain small relative to the player's legs.

Fly swatter

The fly swatter is represented by two visual elements:

Shadow / aiming indicator: A dark, slightly transparent silhouette that follows the mouse and communicates the intended impact location.
Swatter strike visual: A simple fly swatter sprite or shape that briefly animates when the player clicks.

The shadow is the persistent aiming reference. The strike visual provides feedback that a smash has been attempted.

The swatter must remain visible against both the rug and the player's skin.

5. Core Gameplay Loop

The game repeatedly follows this sequence:

The player waits and observes the scene.
A mosquito is selected to attack from the left, Top-Left, right, Top-Right, or top.
A quiet directional buzzing sound begins.
The buzzing grows louder over a warning period of approximately 2–4 seconds.
The mosquito appears from the corresponding screen edge.
It rapidly accelerates or dives toward a target area of exposed skin.
The player moves the fly swatter toward the mosquito and clicks.
If the strike intersects the mosquito at the appropriate moment, the mosquito is killed.
If the mosquito reaches the target skin, the player receives a penalty.
The game schedules another attack.

The audio warning and visible attack must be synchronized. The sound must provide enough information for the player to begin moving toward the correct area before the mosquito becomes difficult to intercept.

Important timing rule

The initial warning should last a randomized 2–4 seconds. Do not make every warning identical, as predictable timing would reduce the importance of listening.

The mosquito should become visible at or near the end of the warning period and then attack quickly.

All timing values must be configurable for future balancing.

6. Mosquito Spawning and AI
Spawn directions

Mosquitoes may spawn from:

Left edge.
Top-Left.
Right edge.
Top-Right.
Top edge.

Mosquitoes must never spawn from the bottom edge.

The selected spawn direction determines the direction of the initial buzzing sound.

Target selection

Each mosquito chooses a target point on an exposed skin area.

Target points should be selected from configurable regions associated with the player's legs and feet. Avoid targeting areas outside the visible player body.

For the initial prototype, target points can be generated from predefined rectangles or polygons corresponding to the exposed skin.

Movement

Each mosquito moves toward its target using a fast, direct dive.

The mosquito must rotate continuously or immediately so its proboscis points toward its current direction of travel.

Movement should feel aggressive and fast rather than like slow floating.

A small amount of variation in speed and trajectory is acceptable, but the initial prototype should prioritize readable and predictable movement over complex flight simulation.

Initial tuning targets

These are starting values, not final balance requirements.

Parameter	Initial value
Warning duration	Random between 2 and 4 seconds
Mosquito size	Approximately 12–24 px, adjusted for screen resolution
Attack duration	Approximately 0.4–1.0 seconds
Active mosquitoes	Start with one attack at a time
Spawn directions	Left, right, top
Target	Random point within exposed skin regions

Use relative scaling where necessary so the mosquito remains small on different screen sizes.

Attack outcome

A mosquito is considered successful if it reaches its target point without being killed.

When this happens:

Play a short bite or impact sound.
Show a brief visual feedback effect on the affected leg.
Increase the bite count.
Remove the mosquito from active gameplay.

The prototype should provide a clear game-over condition after a configurable number of bites. Start with three bites as a placeholder value.

A successful swat kills the mosquito and prevents its bite.

7. Directional Audio — The Core System

This is the most important system in the game.

The player must be able to determine the approximate direction of an approaching mosquito through sound alone, before its visual attack becomes apparent.

7.1 Warning sound

Each incoming attack begins with a mosquito buzz at low volume.

Over a randomized period of 2–4 seconds, the volume increases progressively until the attack begins.

The warning should sound like a mosquito approaching from a particular direction, not like a static sound effect that simply becomes louder.

Use a looping buzzing sound during the warning phase. It should stop when the mosquito is killed, the attack is cancelled, or the attack lifecycle ends.

7.2 Direction mapping

Use the following eight conceptual directions, excluding all directions from the bottom of the screen:

Direction	Approximate horizontal pan	Intended meaning
Left	-1.0	Mosquito approaching from the left
Top-left	-0.7	Mosquito approaching diagonally from the upper-left
Top	0.0	Mosquito approaching from the top
Top-right	+0.7	Mosquito approaching diagonally from the upper-right
Right	+1.0	Mosquito approaching from the right

The intermediate values are starting points for horizontal stereo panning.

The primary requirement is directional readability, not strict adherence to these numerical values.

Important technical limitation: Standard stereo panning communicates left versus right, but it cannot reliably distinguish top from top-left or top-right by itself.

Where possible, implement spatial audio using the Web Audio API's PannerNode with HRTF spatialization and appropriate source positions relative to a virtual listener. This can provide additional spatial cues through headphones, although perceived elevation varies between listeners and devices.

If full spatialization is unavailable or unreliable, retain stereo panning and investigate subtle secondary cues for direction, such as carefully tuned filtering or timbral variation. Do not make pitch the only directional indicator.

7.3 Volume progression

The warning sound must intensify over time.

Use a smooth volume envelope rather than abrupt volume changes.

Suggested behavior:

Early warning: barely audible but distinguishable from silence.
Middle warning: clearly audible and directionally identifiable.
Late warning: urgent, prominent buzzing immediately before the attack.

Use configurable audio parameters and test the progression at realistic desktop listening volumes.

Do not make the initial sound so quiet that the player cannot detect it during ordinary gameplay.

7.4 Spatial audio and visual synchronization

Each attack should have a single source of truth for its direction.

The selected attack direction must determine both:

The spatial position of the buzzing sound.
The edge from which the mosquito enters the screen.

Do not independently randomize audio direction and mosquito spawn direction.

The sound must never indicate the wrong approach direction.

7.5 Audio lifecycle

Every mosquito attack should own its own audio lifecycle.

Start the warning sound when the attack enters its warning phase.
Increase volume using a smooth envelope.
Stop or transition the sound when the visible attack begins, as appropriate for the chosen implementation.
Stop the sound immediately when the mosquito is killed.
Stop and clean up all attack audio when the game ends or restarts.

Prevent overlapping sounds from accumulating indefinitely.

7.6 Audio testing

Test using headphones and ordinary stereo speakers.

Headphones are the preferred reference setup for spatial direction testing.

The implementation should also include a way to test each direction independently during development, such as a temporary debug control or a configurable forced spawn direction.

8. Player Controls

The mouse is the only required input device.

Mouse movement

The fly swatter shadow follows the pointer position.

The pointer position is converted into Phaser world coordinates and constrained to the visible game area.

The shadow must remain visible and accurately represent the impact location.

Left-click

A left-click attempts a smash.

When the player clicks:

Trigger the swatter strike animation.
Evaluate whether the strike intersects an active mosquito.
Kill the mosquito if the hit conditions are satisfied.
Otherwise, play a miss animation or sound if appropriate.

The initial prototype should use a simple circular or polygonal hit area centered on the swatter's impact point.

The hit area must be small enough to require aiming, but large enough to allow a reasonable chance of hitting a fast, small mosquito.

Do not make a click automatically kill a mosquito regardless of distance.

Input handling
Prevent the browser's default context menu if right-click behavior is not used.
Keep mouse coordinates correct when the canvas is scaled.
Avoid accidentally triggering multiple strikes from a single click.
Allow the player to aim and strike immediately without artificial input delay.

9. Swatting and Collision Detection

The swat is an instantaneous impact for the initial prototype.

A strike succeeds if an active mosquito overlaps the strike hit area at the time of impact.

The collision check should use the mosquito's actual gameplay position, not merely its rendered sprite bounds if those bounds are excessively large.

Collision tuning

Because mosquitoes are small and fast:

Use an explicit configurable hit radius or collision shape.
Keep collision geometry consistent with the visible mosquito.
Ensure collision checks are performed every frame during movement.
Consider swept collision detection if a mosquito can move far enough between frames to pass through the strike area without registering a hit.

The strike should not hit a mosquito that is visibly far from the shadow.

Feedback

On a successful hit:

Immediately remove the mosquito from active attack behavior.
Stop its buzzing.
Display a short impact effect (Screen-shake, afew wine color particles).
Play a short swat sound.
Update the successful-hit counter.

On a miss:

Show the swatter strike animation.
Play a subtle miss sound.
Do not penalize the player by default during the first prototype iteration.

Avoid excessive visual effects that obscure other incoming mosquitoes.

10. Game State and User Interface

Implement a minimal game-state system.

Required states:

Ready: The game is initialized and waiting to start.
Playing: Mosquito attacks and player interactions are active.
Game Over: The bite limit has been reached.
Paused: Optional for the initial prototype, but the architecture should not prevent adding it.
Minimal UI

Display:

Bite count.
Successful swat count.
A clear start/restart interaction.
A game-over message when the bite limit is reached.

The interface should be minimal and should not distract from the audio.

Do not add a large directional arrow, radar, or other persistent indicator that reveals where mosquitoes are coming from. Such indicators would undermine the primary audio mechanic.

For development, temporary debug overlays are allowed, but they must be disabled in normal gameplay.

Scoring

Track the number of successful swats and bites.

A full scoring system, combo system, progression system, or leaderboard is outside the initial scope.

Final objective: Deliver a runnable Phaser prototype in which the player hears a mosquito approaching, infers its direction from the buzzing, moves the fly swatter shadow toward the incoming threat, and attempts to smash it before it bites.

### VERSION 1.1

There is a no audio version, where the audio does not matter. In this version instead of audio, will appear on the screen a little red help in order to indicate to the player where the mosquitoes are coming from. This version is selectionable from de main menu.

In this version also, the user can select the speed of the mosquitoes, being the current version the "fast" speed of 5 optiones. "Very slow", "Slow", "Normal", "Fast", "Super Fast".
