# Game Progression System — Implementation Specification

## 1. Overview

Implement a configurable, data-driven progression system for the mosquito-squashing game.

The game consists of 5 sequential phases, each lasting approximately 5 minutes. Difficulty must progressively increase through:

The number of mosquitoes spawned per wave.
The time interval between regular spawn waves.
The probability of spawning special mosquito variants.
The probability of spawning mosquito formations.
The composition and intensity of large horde events.

The system must be configurable and extensible, allowing individual phase parameters to be adjusted without modifying the underlying progression logic.

Important implementation constraint

The core gameplay systems are already implemented.

The following systems already exist and must be reused:

Player health.
Player stress.
Mosquito bites.
Individual mosquito behaviors and variants.
Mosquito formation behaviors.
Mosquito movement and gameplay logic.
Mosquito elimination and tracking.

Do not reimplement existing gameplay mechanics. The purpose of this task is to implement the progression, spawning orchestration, phase management, and transitions between phases.

## 2. Core Design Requirements

The implementation must follow these rules:

There are exactly 5 phases.
Each phase lasts approximately 5 minutes.
Regular mosquito spawning happens at configurable time intervals.
Each regular spawn interval generates a configurable number of mosquitoes.
Every phase must have exactly two scheduled large horde events.
Large hordes temporarily interrupt normal spawning.
Difficulty increases exclusively through enemy quantity, spawn frequency, enemy variants, and formations.
Mosquito movement speed, damage, and health must NEVER be modified as part of progression.
Each phase has its own configurable enemy generation profile.
The player must eliminate every active mosquito before a phase can end.
Player health, stress, and bite-related state must reset at the beginning of every new phase.
There must be no visible progression UI.

### 2.1. Strictly Forbidden Progression Modifications

Progression must NEVER modify:

Mosquito movement speed.
Mosquito damage.
Mosquito health.
Mosquito attack strength.
Any other existing individual mosquito gameplay attributes.

The only difficulty variables are:

Spawn interval.
Number of mosquitoes per spawn.
Mosquito variant selection probabilities.
Formation selection probabilities.
Large horde spawn parameters.

Do not introduce difficulty scaling through any other mechanic.

### 2.2. UI Restrictions

Do not implement any new UI elements related to progression.

Specifically, do not add:

A visible countdown timer.
A phase timer.
A progress bar.
A phase progress indicator.
A wave counter.
A difficulty indicator.
A visible horde countdown.
Any other progression-related HUD element.

All timers, phase states, and spawning logic must operate internally.

The only new UI elements required are the phase result screens and final completion screen described later in this document.

## 3. Phase Structure

Each phase has a target duration of approximately 300 seconds.

Phase	Difficulty	Duration
Phase 1	Very Easy	300 seconds
Phase 2	Easy	300 seconds
Phase 3	Medium	300 seconds
Phase 4	Hard	300 seconds
Phase 5	Very Hard	300 seconds

Each phase contains:

An initial preparation period.
Normal spawning.
First large horde event, approximately halfway through the phase.
Normal spawning.
Second large horde event, near the end of the phase.
Remaining normal spawning, if applicable.
Spawn shutdown when the phase duration expires.
A cleanup period where the player must eliminate all remaining mosquitoes.
Phase completion and results screen.
Important: Phase duration versus phase completion

The 300-second timer determines when new enemies can no longer spawn.

It does NOT automatically complete the phase.

When the phase timer reaches zero:

Immediately stop all new mosquito spawning.
Cancel any pending regular spawn operations.
Prevent any additional horde spawns.
Allow all currently active mosquitoes to remain in the scene.
Wait until every active mosquito has been eliminated.
Only then trigger the phase completion sequence.

The phase must never transition while active mosquitoes remain.

The phase duration is therefore the target gameplay duration, not a guaranteed maximum duration.

## 4. Phase Configuration Architecture

Use a data-driven architecture.

Each phase should have its own configuration object containing all parameters required to control its difficulty and spawning behavior.

Avoid hardcoding phase-specific conditions throughout the spawning logic.

The progression controller should read the active phase configuration and execute the same spawning algorithms regardless of which phase is running.

A conceptual configuration structure could look like this:

csharp
PhaseConfig
{
    phaseId;
    duration;

    initialSpawnDelay;

    normalSpawnSettings;
    enemySpawnWeights;
    formationSettings;

    hordeEvents;
}


The exact implementation must follow the project's existing architecture, programming language, naming conventions, and design patterns.

Do not introduce unnecessary architectural complexity.

### 4.1. Normal Spawn Settings

Each phase must configure:

csharp
NormalSpawnSettings
{
    spawnInterval;
    mosquitoesPerWave;
}


Initial reference values:

Spawn interval: 4000 ms.
Mosquitoes per wave: 3.

These are starting values, not fixed values.

Both parameters must be configurable independently for every phase.

### 4.2. Difficulty Progression

The general difficulty progression should follow this direction:

Parameter	Phase 1	Phase 2	Phase 3	Phase 4	Phase 5
Spawn interval	Long	Shorter	Short	Shorter	Shortest
Mosquitoes per wave	Low	Higher	Higher	High	Highest
Standard mosquitoes	Dominant	Dominant	Reduced	None	None
Special variants	None	Limited	Increasing	Dominant	Dominant
Formations	None	None	Introduced	Frequent	Frequent

The exact numeric values should be stored in phase configuration rather than embedded in the algorithms.

Recommended balancing principles
Phase 1 should feel calm and approachable.
Phase 2 should introduce more frequent spawning and limited enemy variety.
Phase 3 should introduce formations and a wider selection of special mosquitoes.
Phase 4 should remove standard individual mosquitoes from the regular enemy pool.
Phase 5 should be the most intense phase, with a high concentration of special variants and formations.

The transition between phases should feel progressively more demanding without modifying individual mosquito attributes.

## 5. Enemy Types

The following mosquito types already exist in the game.

The progression system must be able to select and spawn all of them.

Enemy type	Internal identifier
Standard	Standard
Coward	Coward
Drunk	Drunk
Hematophagous	Hematophagous
Incubator	Incubator
Zigzagger	Zigzagger

Use the existing enemy identifiers and implementation wherever possible.

Do not create duplicate mosquito classes or duplicate their behaviors.

### 5.1. Special Enemy Progression

Special mosquito variants should become progressively more common as the player advances through the phases.

The intended progression is:

Phase 1: Only standard mosquitoes.
Phase 2: Standard mosquitoes remain dominant, with limited special variants.
Phase 3: Special variants become increasingly common.
Phase 4: No individual standard mosquitoes should spawn. Only special variants and standard mosquito formations.
Phase 5: No individual standard mosquitoes should spawn. Special variants and formations dominate.

The enemy pool must be configurable, so the probability of every enemy type can be adjusted independently for each phase.

## 6. Mosquito Formations

The following formations already exist:

V Formation.
Column Formation.
Circular Formation.
Oscillating Swarm.

All mosquitoes inside formations MUST be standard mosquitoes.

Formations are not special mosquito variants.

Their difficulty comes from their spatial composition and movement behavior, making it difficult for the player to eliminate multiple mosquitoes simultaneously.

### 6.1. Formation Generation Rules

Formations must only be considered when the initial enemy selection resolves to a standard mosquito.

The generation process should work as follows:

Select an enemy type using the phase's enemy probability distribution.
If the result is a special mosquito, spawn that mosquito normally.
If the result is a standard mosquito, perform a second selection.
The second selection determines whether to spawn:
An individual standard mosquito.
A V formation.
A Column formation.
A Circular formation.
An Oscillating Swarm.

The probability of each formation must be independently configurable per phase.

Important restrictions
Formations must never contain special mosquito variants.
Formations must not be generated independently from the standard mosquito selection process.
Do not modify the existing formation movement or behavior.
Use the existing formation spawning mechanisms.

A formation should be treated as a single spawn decision that produces a group of standard mosquitoes.

Its individual mosquitoes must still be tracked as active enemies so that phase completion correctly waits for every member to be eliminated.

## 7. Weighted Random Enemy Selection

Implement a weighted random selection algorithm.

This is preferable to manually iterating through enemy lists using arbitrary random thresholds because it is easier to maintain, balance, and extend.

Each phase defines a weight for every enemy type.

For example:

csharp
EnemySpawnWeights
{
    Standard = 100;
    Coward = 0;
    Drunk = 0;
    Hematophagous = 0;
    Incubator = 0;
    Zigzagger = 0;
}


These are illustrative weights, not mandatory final values.

### 7.1. Weighted Selection Algorithm

The algorithm should:

Read all configured enemy weights.
Exclude entries with a weight of zero.
Calculate the sum of all valid weights.
Generate a random number between zero and the total weight.
Iterate through the weighted entries.
Select the first entry whose cumulative weight exceeds the random value.

Conceptually:

text
totalWeight = sum(all valid weights)

randomValue = random(0, totalWeight)

for each enemy in enemyPool:
    cumulativeWeight += enemy.weight

    if randomValue < cumulativeWeight:
        return enemy


The resulting probability is:

enemy probability = enemy weight / total weight

Weights do not need to add up to 100.

For example:

text
Standard: 60
Coward: 20
Drunk: 10
Hematophagous: 10


This produces the same relative probabilities as:

text
Standard: 60%
Coward: 20%
Drunk: 10%
Hematophagous: 10%


The system must handle invalid or empty pools safely.

If all weights are zero, do not silently generate an invalid enemy. Log an appropriate configuration error and use a clearly defined safe fallback or stop the spawning operation.

### 7.2. Formation Selection Algorithm

Only when the first selection returns Standard should the formation selection algorithm execute.

Example configuration:

csharp
FormationSpawnWeights
{
    IndividualStandard = 70;
    VFormation = 10;
    ColumnFormation = 10;
    CircularFormation = 5;
    OscillatingFormation = 5;
}


These values are illustrative.

Use the same weighted random selection algorithm.

The formation selection system must be independent from the special mosquito selection weights.

This provides two separate balancing dimensions:

How frequently special mosquitoes appear.
How frequently standard mosquitoes appear in formations.
Important probability rule

The formation weights are conditional probabilities.

For example, if standard mosquitoes represent 40% of all enemy selections and formations represent 30% of standard selections, formations account for approximately 12% of all initial spawn decisions.

This behavior is intentional.

## 8. Large Horde Events

Every phase must contain exactly two large horde events.

These events are inspired by the large waves in Plants vs. Zombies.

The first horde should occur approximately halfway through the phase.

The second horde should occur near the end of the phase.

Both events must be configurable independently.

### 8.1. Horde Event Configuration

Each phase should contain two configurable horde definitions.

Conceptually:

csharp
HordeEventConfig
{
    triggerTime;

    preparationDuration;

    hordeDuration;

    spawnInterval;

    mosquitoesPerWave;
}


The actual configuration structure can be adapted to the project's architecture.

Recommended initial design:

Parameter	First Horde	Second Horde
Trigger time	150 seconds	255 seconds
Preparation duration	5 seconds	5 seconds
Horde duration	Configurable	Configurable
Spawn interval	Configurable	Configurable
Mosquitoes per wave	Configurable	Configurable

These are initial balancing suggestions, not hardcoded requirements.

### 8.2. Horde Event Sequence

Each horde follows four stages.

Stage 1 — Preparation

Before the large horde begins:

Stop regular mosquito spawning.
Wait for the configured preparation duration.
Do not remove or freeze existing mosquitoes.
Do not reset the phase timer.
Do not pause gameplay.

The player should have a brief moment before the intense spawning sequence begins.

Stage 2 — Horde Spawning

Once preparation finishes:

Start spawning mosquitoes continuously in repeated waves.
Use the horde-specific spawn interval.
Use the horde-specific mosquitoes-per-wave value.
Continue until the configured horde duration expires.

Horde spawning must use the same enemy selection and formation generation systems as normal spawning.

The phase's enemy pool and formation probabilities must remain active during hordes unless a specific configuration explicitly overrides them.

Stage 3 — Horde Completion

When the configured horde duration expires:

Stop horde spawning.
Do not remove existing mosquitoes.
Do not wait for all mosquitoes to be eliminated.
Restore normal spawning if the phase timer has not expired.

Stage 4 — Return to Normal

Resume normal spawning using the phase's regular spawn settings.

The phase timer continues running throughout preparation, horde spawning, and normal spawning.

### 8.3. Horde Difficulty

Large hordes should be significantly more intense than normal spawning.

Recommended balancing approach:

Reduce the normal spawn interval by a configurable percentage.
Increase the number of mosquitoes per wave.
Optionally adjust the enemy composition through the same phase-specific weighted pools.

For example:

text
Normal interval: 4000 ms

Horde interval reduction: 25%

Horde interval: 3000 ms


And:

text
Normal mosquitoes per wave: 3

Horde quantity multiplier: 2

Horde mosquitoes per wave: 6


These are examples only.

Prefer explicit configurable horde values over hardcoding multipliers into the spawning algorithm.

This allows different phases to have completely different horde intensities.

### 8.4. Horde Timing and Phase Duration

The phase timer must continue running during horde events.

If a horde extends beyond the phase's 300-second duration:

The phase duration takes priority.
Stop all new spawning immediately when the phase timer expires.
Cancel any remaining horde spawn operations.
Enter the cleanup state.
Wait until all active mosquitoes are eliminated.

Never spawn additional enemies after the phase duration expires.

## 9. Spawning State Management

Implement a clear spawning state machine to prevent overlapping spawn operations.

Suggested states:

text
WaitingForInitialDelay
        |
        v
NormalSpawning
        |
        v
HordePreparation
        |
        v
HordeSpawning
        |
        v
NormalSpawning
        |
        v
HordePreparation
        |
        v
HordeSpawning
        |
        v
NormalSpawning
        |
        v
SpawnShutdown
        |
        v
WaitingForActiveEnemies
        |
        v
PhaseCompleted


The actual state transitions must account for the phase timer expiring at any point.

### 9.1. State Responsibilities

WaitingForInitialDelay

Wait for the configured initial delay.
Do not spawn mosquitoes.
Start the phase timer when gameplay spawning begins.

NormalSpawning

Execute regular spawn intervals.
Generate the configured number of mosquitoes.
Use weighted enemy selection.

HordePreparation

Stop regular spawning.
Wait for the preparation duration.

HordeSpawning

Execute repeated horde spawn intervals.
Use horde-specific spawn settings.

SpawnShutdown

Stop all spawning.
Cancel pending spawn operations.

WaitingForActiveEnemies

Monitor the number of active mosquitoes.
Wait until all mosquitoes have been eliminated.

PhaseCompleted

Lock progression for the current phase.
Capture final statistics.
Begin the phase completion transition.

### 9.2. Preventing Overlapping Spawn Operations

There must never be more than one active spawning routine.

For example:

Normal spawning cannot continue during preparation.
Normal spawning cannot continue during a horde.
Two horde events cannot overlap.
A spawn operation cannot continue after phase expiration.
A new phase cannot start while the previous phase is still active.

Use the project's existing coroutine, timer, async, or scheduling system.

Do not introduce multiple independent timers if one centralized spawning controller can handle the scheduling more reliably.

## 10. Active Enemy Tracking

Correct enemy tracking is critical because phase completion depends on eliminating all active mosquitoes.

The progression system must know how many mosquitoes remain alive in the current phase.

Requirements:

Register every mosquito when it becomes active.
Register every individual mosquito inside a formation.
Unregister mosquitoes when they are eliminated or permanently removed.
Prevent duplicate registration.
Prevent duplicate removal.
Ensure formation members are tracked individually.
Ensure destroyed, despawned, or otherwise removed mosquitoes cannot remain registered indefinitely.

A formation must not be considered eliminated merely because its formation controller has been destroyed.

Every individual mosquito belonging to that formation must be accounted for.

### 10.1. Phase Completion Condition

The phase can only complete when both conditions are true:

text
phaseTimer >= phaseDuration
AND
activeEnemyCount == 0


The completion event must execute exactly once.

Do not rely exclusively on the visual presence or absence of enemies in the scene if the project already has an enemy tracking system.

Prefer explicit enemy registration and removal.

## 11. Initial Delay and Phase Initialization

Every phase must have a configurable initial spawn delay.

Default:

text
initialSpawnDelay = 3 seconds


This delay occurs after the scene has finished transitioning from black to gameplay.

During this delay:

No mosquitoes spawn.
Gameplay systems should already be initialized.
The player should have time to prepare.
The phase timer should not yet be running.

The actual 300-second phase timer starts when the initial delay finishes and spawning becomes active.

This ensures that the player receives the intended full gameplay duration.

### 11.1. Phase Initialization

At the beginning of every phase:

Load the phase configuration.
Initialize the progression controller.
Clear any remaining state from the previous phase.
Reset player health using the existing health system.
Reset player stress using the existing stress system.
Reset bite-related state and counters using the existing bite system.
Reset phase-specific statistics.
Initialize active enemy tracking.
Initialize the horde event scheduler.
Begin the transition into the gameplay scene if applicable.
Wait for the initial spawn delay after the fade-in finishes.
Start the phase timer.
Begin normal spawning.
Important

The player health, stress, and bite systems already exist.

Do not implement replacement systems.

Call their existing reset or initialization methods.

Do not reset these values during a horde or during the cleanup period.

They must reset only when a new phase begins.

## 12. Phase Statistics

At the end of each phase, display a results screen containing statistics from that phase.

At minimum, track:

Mosquitoes eliminated.
Mosquito bites received.

Additional existing statistics may be included if they are already available and relevant.

Statistics must be phase-specific.

At the beginning of a new phase:

Reset the phase statistics.
Do not accidentally display cumulative statistics from previous phases.

Capture the final statistics before resetting player state or transitioning into the next phase.

The progression system should retrieve statistics from the existing gameplay systems rather than implementing duplicate counters whenever possible.

## 13. Scene Transitions

Transitions between gameplay and results screens must use a slow black fade.

The intended sequence is:

text
Gameplay
   |
   v
Slow fade to black
   |
   v
Show phase results menu
   |
   v
Player selects Next Phase
   |
   v
Slow fade to black
   |
   v
Load next gameplay scene
   |
   v
Slow fade from black
   |
   v
Wait 3 seconds
   |
   v
Begin spawning


The fade duration must be configurable.

Reuse any existing transition or scene-loading systems if available.

Do not create duplicate transition managers.

### 13.1. Results Screen

After a phase has ended and every mosquito has been eliminated:

Stop progression and spawning systems.
Capture phase statistics.
Fade the screen to black.
Display the phase results menu.

The results menu must include:

Mosquitoes eliminated.
Mosquito bites received.
Any other relevant existing phase statistics.
A button to continue to the next phase.
A button to return to the main menu.

The results menu should only appear after all active mosquitoes have been eliminated.

### 13.2. Next Phase Button

When the player selects the next phase:

Prevent additional button interactions.
Begin a slow fade to black.
Load the next gameplay scene.
Initialize the next phase.
Reset health, stress, and bite-related state.
Reset phase-specific statistics.
Fade back into gameplay.
Wait for the configured initial spawn delay.
Begin spawning.

Use the project's existing scene management architecture.

13.3. Main Menu Button

When the player selects the main menu:

Prevent additional button interactions.
Fade to black.
Load the main menu scene.
Complete the transition.

Do not start any gameplay spawning operations.

## 14. Final Phase Completion

Phase 5 is the final phase.

Its completion sequence must be different from phases 1–4.

Once all mosquitoes have been eliminated after the phase timer expires:

Stop all progression and spawning systems.
Capture final phase statistics.
Fade the screen to black.
Display a game completion menu.

The final completion menu must include:

A message indicating that the player completed the game.
Mosquitoes eliminated.
Mosquito bites received.
Any other relevant statistics.
A button to return to the main menu.

There must NOT be a Next Phase button.

The final completion screen should clearly communicate that the game has been completed.

## 15. Configuration and Extensibility

All important progression parameters must be configurable without changing the underlying spawning algorithms.

Prefer the project's existing configuration mechanism.

Depending on the engine and architecture, suitable options may include:

ScriptableObjects.
Serializable configuration classes.
Data assets.
JSON configuration files.
Existing project-specific configuration systems.

Do not introduce an entirely new configuration framework if the project already has an appropriate solution.

The system should support:

Changing phase duration.
Changing normal spawn intervals.
Changing normal mosquitoes per wave.
Changing initial spawn delay.
Changing enemy weights.
Changing formation weights.
Changing horde trigger times.
Changing horde preparation duration.
Changing horde duration.
Changing horde spawn intervals.
Changing horde mosquitoes per wave.
Changing transition durations.

The configuration should allow balancing the entire game without modifying the core spawning logic.

## 16. Error Handling and Edge Cases

Handle the following situations explicitly.

Empty enemy pool

If no valid enemy has a positive weight, report a configuration error and use a safe, explicitly defined fallback or stop spawning.

Empty formation pool

If no formation has a positive weight, spawn an individual standard mosquito whenever Standard is selected.

Phase timer expiration during normal spawning

Cancel pending spawn operations and enter cleanup.

Phase timer expiration during horde preparation

Cancel the preparation and enter cleanup without starting the horde.

Phase timer expiration during horde spawning

Stop the horde immediately and enter cleanup.

Zero active enemies when the timer expires

Complete the phase immediately.

Enemy eliminated during phase cleanup

Update active enemy tracking and check the phase completion condition.

Duplicate completion events

Guarantee that the phase completion sequence executes only once.

Scene transition during active spawning

Stop all spawning operations before unloading the gameplay scene.

Formation elimination

Ensure all individual mosquitoes belonging to the formation are correctly tracked and removed.

Unexpected enemy destruction

Prevent destroyed enemies from remaining in the active enemy registry indefinitely.

## 17. Implementation Guidelines for GitHub Copilot

Before writing code, inspect the existing project.

Identify:

The current scene management system.
The existing player health system.
The existing stress system.
The existing bite system.
The mosquito spawning system.
The existing mosquito variants.
The existing formation spawning system.
The enemy destruction and elimination lifecycle.
Existing UI and transition systems.
Existing statistics tracking.

Then implement the progression system by integrating with these systems.

Implementation Rules
Reuse existing classes, components, managers, and methods whenever possible.
Do not duplicate existing gameplay functionality.
Do not modify individual mosquito behaviors.
Do not modify mosquito speed, damage, or health.
Do not introduce progression-related HUD elements.
Keep phase configurations separate from progression logic.
Keep enemy selection separate from spawning execution.
Keep horde scheduling separate from enemy behavior.
Ensure enemy tracking works with both individual mosquitoes and formations.
Ensure spawning operations cannot overlap.
Ensure scene transitions cleanly stop the previous phase.
Follow existing project naming conventions and architectural patterns.
Avoid unnecessary refactoring of unrelated systems.
Avoid introducing external dependencies unless strictly necessary.

If an existing system does not expose the functionality needed for progression, make the smallest necessary integration change rather than reimplementing that system.

Do not assume class names, scene names, method signatures, or project structure before inspecting the codebase.

## 18. Acceptance Criteria

The implementation is considered complete when all the following requirements are satisfied.

Phase Progression
The game supports exactly five sequential phases.
Each phase has an approximately five-minute duration.
Each phase has independent configuration.
The phase timer starts after the initial spawn delay.
Phase progression does not modify mosquito speed, damage, or health.
Normal Spawning
Regular spawning uses configurable intervals.
The number of mosquitoes per wave is configurable.
Each phase uses its own spawn parameters.
Enemy selection uses weighted random selection.
Enemy Variants
All six existing mosquito types can be selected.
Each phase has configurable enemy weights.
Standard mosquitoes become less common as phases progress.
Phase 4 and Phase 5 do not spawn individual standard mosquitoes.
Formations
All four existing formations can be selected.
Formations are only selected after Standard is selected.
Every formation contains only standard mosquitoes.
Formation probabilities are independently configurable.
Individual formation members are tracked as active enemies.
Large Horde Events
Every phase has exactly two large horde events.
The first horde occurs approximately halfway through the phase.
The second horde occurs near the end.
Normal spawning stops during horde preparation.
Horde spawning uses configurable intervals and quantities.
Normal spawning resumes after a horde if the phase is still active.
The phase timer continues during hordes.
No enemies spawn after the phase timer expires.
Phase Completion
Reaching the time limit stops all spawning.
Existing mosquitoes remain active after the time limit.
The phase waits until every active mosquito is eliminated.
Phase completion executes exactly once.
Player State
Health resets at the beginning of each phase.
Stress resets at the beginning of each phase.
Bite-related state resets at the beginning of each phase.
Existing player systems are reused.
These values are not reset during hordes or cleanup.
UI and Transitions
No visible progression timer is added.
No progress bar is added.
No phase indicator or wave counter is added.
Phase results appear after all mosquitoes are eliminated.
Results include mosquitoes eliminated and bites received.
The results screen provides Next Phase and Main Menu buttons for phases 1–4.
Phase 5 displays a game completion screen.
Phase 5 does not display a Next Phase button.
Scene transitions use a slow black fade.
The initial spawn delay is configurable and defaults to 3 seconds.

## 19. Final Implementation Objective

The final result should be a robust and highly configurable progression system that transforms the existing gameplay into a five-phase experience.

The system must provide a gradual transition from a calm experience in Phase 1 to an intense and frenetic experience in Phase 5.

The difficulty must emerge exclusively from the number of mosquitoes appearing, the frequency of their arrival, the variety of mosquito types, and the spatial complexity of their formations.

Large horde events should create memorable moments of increased pressure throughout each phase.

Most importantly, the progression system must remain independent of individual mosquito behavior, reuse the existing gameplay systems, and allow future balancing through configuration rather than code changes.

Prioritize integration with the existing project over unnecessary rewrites.