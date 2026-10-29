# ENEMIES.md — Mosquito Enemy Design Specification

## 1. Purpose

This document specifies the gameplay behavior, state machines, combat rules, visual characteristics, and configuration requirements for six mosquito enemy types.

The standard mosquito is already implemented and serves as the baseline for movement, targeting, biting, damage, and death behavior.

Core Requirements
Implement the five new mosquito types while preserving the existing standard mosquito behavior.
Make all relevant gameplay parameters easily configurable without modifying enemy behavior code.
Use explicit state machines for enemies with multiple behaviors.
Ensure movement and damage calculations are frame-rate independent.
Reuse existing combat, collision, targeting, and animation systems whenever possible.
Ensure all enemy types interact consistently with the existing combat system.
Keep visual configuration separate from gameplay logic wherever practical.

## 2. Shared Combat Rules

Damage

All damage values are expressed as damage per second while the enemy is actively biting.

Damage from multiple mosquitoes biting simultaneously stacks independently. For example, if two mosquitoes deal 1 damage per second and another deals 2 damage per second, the total damage rate is 4 damage per second.

Damage must stop immediately when an enemy exits its biting state, becomes unable to attack, or is defeated.

Health and Hits

For enemies whose durability is specified in hits, use the following defaults:

Enemy	Hits to defeat	Damage per second
Standard Mosquito	1	1
Incubator Mosquito	1	1
Baby Mosquito	1	1
Coward Mosquito	3	3
Parasite Mosquito	1	2
Zigzag Mosquito	2	2

Where necessary, represent hit-based durability with a configurable health or hit-point system consistent with the existing combat implementation.

Target Legs

The player has two legs, referred to as the left and right legs.

A nearest-leg query must determine the closest leg using the enemy's current position.
Enemies must update their target when the applicable targeting rules require it.
An enemy must not continue attacking an invalid target.
Damage must only be applied while the enemy is actively biting under the existing combat rules.
Shared Configurability

All gameplay values must be configurable, including:

Health and hits required to defeat.
Movement and escape speeds.
Attack damage per second.
Target detection and attack distances.
Timers and transition delays.
Spawn counts and launch velocities.
Formation spacing and dispersion parameters.
Visual scale and size.
Area-of-effect radius and damage.
Randomization ranges.

Use the project's existing configuration architecture, such as serialized fields, configuration assets, or data-driven enemy definitions.

Avoid hard-coding tunable gameplay values in state transitions or movement logic.

## 3. Standard Mosquito

Status: Already implemented.

Properties
Health: 1 hit.
Movement: Slow.
Damage: 1 damage per second.
Target: The player's leg.
Behavior
Move directly toward the target leg.
Begin biting when the existing attack conditions are satisfied.
Deal 1 damage per second while biting.
Die after one successful hit.
Implementation Requirements

Preserve the existing behavior and avoid unnecessary changes. Expose its relevant parameters through the configuration system where practical.

## 4. Incubator Mosquito
Properties
Health: 1 hit.
Movement: Slow.
Damage: 1 damage per second.
Appearance: Slightly more voluminous abdomen than the standard mosquito.
Behavior

The incubator mosquito behaves like a standard mosquito until defeated.

Upon death:

Spawn a random number of baby mosquitoes, between 3 and 5 inclusive by default.
Spawn all babies from the exact position where the incubator was defeated.
Launch the babies outward in a dispersed cone directed away from the leg the incubator was targeting.
Give each baby an initial launch velocity so that it visibly bursts outward.
Keep each baby's normal AI behavior disabled during the launch phase.
Activate each baby's normal behavior after a randomized delay between 200 and 300 milliseconds by default.
Once activated, each baby begins its normal grouping behavior.
Launch Direction

The cone direction must be calculated relative to the incubator's targeted leg.

The central direction points away from that leg, and each baby receives an independently randomized direction within the configurable cone angle.

This should create a dispersed outward burst rather than a tightly aligned stream.

States
Approaching: Moves toward the target leg.
Biting: Deals damage to the player.
Death: Triggers the death response and spawns the babies.

The spawned babies manage their own launch and activation phases.

Configurable Parameters
minBabiesSpawned — default: 3.
maxBabiesSpawned — default: 5.
babyLaunchSpeed.
babyLaunchConeAngle.
babyActivationDelayMin — default: 0.2 seconds.
babyActivationDelayMax — default: 0.3 seconds.
abdomenScale.
visualScale.
movementSpeed.
attackDamagePerSecond.

## 5. Baby Mosquito
Properties
Health: 1 hit.
Movement: Slow during normal movement.
Damage: 1 damage per second.
Appearance: Significantly smaller than the standard mosquito.
Behavior Overview

Baby mosquitoes coordinate their approach by grouping together and traveling toward the nearest player leg. When they enter a configurable zone around that leg, they disperse and approach different attack positions on the same leg.

State Machine

State A: Grouping
Identify the nearest player leg.
Detect nearby baby mosquitoes.
Attempt to group with other nearby babies.
Move toward the target leg as a coordinated group.
Maintain a recognizable group formation during the approach.
Transition to Dispersing when entering the configurable target-leg zone.

Babies must continue making progress even when no other babies are nearby. A baby must never remain stuck waiting for a group to form.

State B: Dispersing
Stop following the shared group formation.
Keep the same target leg selected during the transition unless it becomes invalid.
Assign an individual attack position to each baby.
Randomize positions so the babies spread across the target leg instead of concentrating at one point.
Move independently toward their assigned positions.
Transition to Biting when the attack conditions are satisfied.

The target-leg zone determines when dispersion begins. It must not be confused with the individual attack positions.

State C: Biting
Reach the assigned attack position.
Remain at that position while attacking, subject to the existing combat rules.
Deal 1 damage per second while biting.
Target Selection
Babies select the nearest leg when beginning their approach.
Babies in the same group should generally share the same target leg.
Once dispersion starts, each baby keeps the selected leg to ensure that the group spreads across the same leg.
If the target leg becomes invalid, select a new valid target and update the behavior accordingly.
Configurable Parameters
visualScale.
movementSpeed.
groupingRadius.
groupMovementSpeed.
groupFormationSpacing.
dispersionTriggerDistance or dispersionZoneRadius.
dispersionRadius.
minimumAttackPositionSpacing.
targetPositionRandomization.
attackDamagePerSecond.

## 6. Coward Mosquito
Properties
Health: 3 hits in total.
Movement: Slow while approaching; fast while escaping.
Damage: 3 damage per second.
Appearance: Slightly larger than the standard mosquito.

The coward mosquito must retain its accumulated damage across all escape and reappearance cycles. Its health must never reset when it disappears or re-enters the screen.

State Machine
State A: Normal
Move slowly and directly toward the target leg.
Begin biting when the attack conditions are satisfied.
When hit but not defeated, immediately enter Escaping.
Preserve its remaining health and total hits received.

State B: Escaping
Move rapidly away from the player, out of the screen, retracing the trajectory used to approach the player.
Remain vulnerable to attacks throughout the escape.
Continue taking damage from valid hits.
If defeated during escape, immediately trigger the blood explosion.
If the escape completes while the mosquito is still alive, transition to Reappearing.

The escape should reverse the actual approach trajectory as closely as the movement system allows. If exact trajectory reversal is impractical, use the recorded approach path or a suitable approximation.

State C: Reappearing
Select a randomized entry position along the screen boundary.
Re-enter the playable area.
Resume the slow approach behavior.
Repeat the cycle until defeated.

Reappearance must not restore health or reset the number of hits already received.

State D: Death Explosion

Whenever the coward mosquito is defeated, including during escape, trigger a large blood explosion centered on its death position.

The explosion must:

Affect all valid mosquitoes within its configurable radius.
Apply area damage through the existing combat system.
Be capable of defeating nearby one-hit mosquitoes.
Allow multi-hit enemies to receive damage according to their health.
Avoid damaging the player unless explicitly enabled by a separate configuration option.

The explosion should be resolved immediately when the coward mosquito dies so that the effect does not depend on whether the mosquito is in its normal or escaping state.

Configurable Parameters
maxHealth — default: 3 hits.
movementSpeed.
escapeSpeed.
attackDamagePerSecond — default: 3.
escapeDistance or escapeDuration.
reappearanceDelay.
reappearanceEntryMargin.
bloodExplosionRadius.
bloodExplosionDamage.
bloodExplosionKnockback, if knockback is supported.
bloodExplosionAffectsPlayer — default: false.
visualScale.

## 7. Parasite Mosquito
Properties
Health: 1 hit when vulnerable.
Damage: 2 damage per second.
Search movement: Moderately fast.
Attached movement: Matches the host's movement speed.
Biting movement: Normal movement speed.
State Machine

The parasite mosquito has three primary states:

Searching
Parasitic
Biting
State A: Searching
Find the nearest valid mosquito host.
Move toward that host at the configurable search speed.
Attach when within the configurable attachment range.
Enter Parasitic.

While searching, the parasite is vulnerable to hits and can be defeated in one hit.

If no valid host is available, continue searching according to the configured search rules.

State B: Parasitic

While attached to a host:

Follow the host's position and rotation.
Match the host's movement speed and movement direction.
Maintain a configurable offset slightly behind the host.
Become immune to ordinary damaging hits while attached.
If hit, detach immediately and return to Searching.
Do not lose health when hit in this state.
Do not transfer the hit's damage to the host.
Monitor the host's current attack state.

When the host begins biting:

Transition to Biting.
Target the opposite leg from the host's current target leg.

A hit while attached acts exclusively as a forced detachment. It must not damage or defeat either mosquito.

Host Death or Invalidity

If the host dies, is removed, or otherwise becomes invalid:

Detach immediately.
Return to Searching.
Search for another valid mosquito host.

The parasite must not remain attached to a defeated or nonexistent host.

State C: Biting
Move toward the leg opposite to the host's current target leg.
Use the configurable normal movement speed.
Become vulnerable to hits.
Deal 2 damage per second while biting.
Follow the existing attack and damage rules.

The parasite must not attack the same leg that its host is currently attacking.

If the host becomes invalid, immediately return to Searching and stop any attack behavior associated with that host.

Configurable Parameters
searchMovementSpeed.
movementSpeed.
attackDamagePerSecond — default: 2.
hostDetectionRange.
attachmentRange.
attachmentPositionOffset.
attachmentRotationOffset.
searchRetryInterval, if periodic searching is used.

## 8. Zigzag Mosquito
Properties
Health: 2 hits.
Damage: 2 damage per second.
Target: Always the nearest player leg.
Behavior

The zigzag mosquito advances toward the nearest leg through alternating lateral movements, combining fast movement segments with brief pauses.

Its trajectory must maintain forward progress toward the target leg while producing visible left-right zigzag movement.

Movement Cycle
Identify the nearest player leg.
Calculate the direction toward the selected leg.
Select a lateral direction perpendicular to the approach direction.
Move along a short zigzag segment at the configured fast movement speed.
Pause for a randomized duration between 200 and 500 milliseconds by default.
Alternate the lateral direction for the next movement segment.
Repeat until the attack position is reached.
Begin biting according to the existing combat rules.

The mosquito must not move exclusively sideways or become stuck oscillating around the same position.

Target Updates

The target leg must always be the nearest leg. Re-evaluate the nearest leg according to the project's targeting update rules, and allow the target to change if the other leg becomes closer.

The movement direction and zigzag pattern must adapt to the new target without abrupt or invalid state transitions.

Configurable Parameters
maxHealth — default: 2 hits.
movementSpeed.
fastMovementSpeed.
attackDamagePerSecond — default: 2.
zigzagAmplitude.
zigzagSegmentDuration.
pauseDurationMin — default: 0.2 seconds.
pauseDurationMax — default: 0.5 seconds.
forwardProgressFactor.
zigzagRandomization.
targetReevaluationInterval, if periodic updates are used.

## 9. Global Configuration Requirements

Every mosquito type must expose its relevant gameplay parameters through the project's configuration system.

Required Principles
Do not hard-code tunable values in behavior logic.
Use separate configuration profiles for each mosquito type.
Allow designers to adjust parameters without changing state-machine implementation.
Provide sensible defaults based on this document.
Validate numeric ranges where appropriate.
Document units consistently: seconds for durations, units per second for speeds, units for distances, and damage per second for attack damage.
Use configurable random ranges for all randomized behaviors.
Ensure configuration changes do not break state transitions or enemy death handling.
Reuse shared configuration fields when appropriate while preserving enemy-specific settings.
Suggested Configuration Profiles
StandardMosquitoConfig
IncubatorMosquitoConfig
BabyMosquitoConfig
CowardMosquitoConfig
ParasiteMosquitoConfig
ZigzagMosquitoConfig

These are illustrative names. Adapt them to the project's existing architecture and naming conventions.

## 10. State and Lifecycle Requirements

All enemy state machines must follow these rules:

Only the active state may control the enemy's movement and attack behavior.
Damage must only be applied while the enemy is actively biting.
Defeated enemies must not continue moving, attacking, or executing delayed actions.
Timers and delayed callbacks must be cancelled or safely ignored when no longer valid.
Spawned enemies must be initialized before their AI is activated.
State transitions must correctly enable and disable vulnerability.
Invalid targets must be handled safely.
Death effects must execute only once.
Damage from area effects must use the normal enemy damage and death pipeline.

## 11. Implementation Checklist

Standard Mosquito
Preserve existing behavior.
One-hit defeat.
1 damage per second while biting.

Incubator Mosquito
One-hit defeat.
More voluminous abdomen.
Spawn 3–5 babies by default.
Launch babies in a cone away from the targeted leg.
Spawn babies at the death position.
Disable baby AI during the initial launch.
Activate baby AI after 200–300 milliseconds by default.

Baby Mosquito
One-hit defeat.
Significantly smaller appearance.
Group movement toward the nearest leg.
Dispersion when entering the configurable target-leg zone.
Different attack positions distributed across the same leg.
1 damage per second while biting.
Correct behavior when no other babies are nearby.

Coward Mosquito
Three hits in total to defeat.
Slow approach and fast escape.
Reverse the approach trajectory during escape.
Remain vulnerable during escape.
Preserve health across reappearances.
Reappear from a randomized screen boundary position.
Trigger a large blood explosion on death.
Apply area damage to nearby mosquitoes, including one-hit enemies.

Parasite Mosquito
Search for the nearest valid mosquito host.
Attach with stable relative position and rotation.
Match host movement while attached.
Become immune to ordinary damaging hits while attached.
Detach immediately when hit while attached.
Return to searching without transferring damage to the host.
Return to searching when the host dies or becomes invalid.
Attack the opposite leg when the host begins biting.
Deal 2 damage per second while biting.

Zigzag Mosquito
Two-hit defeat.
Always target the nearest leg.
Alternate lateral movement directions.
Combine fast movement and short pauses.
Use configurable pause durations, defaulting to 200–500 milliseconds.
Maintain forward progress toward the target.
Global
All relevant parameters are easily configurable.
Simultaneous mosquito attacks stack their damage.
State transitions are explicit and safe.
Death and damage handling are consistent across enemy types.
Randomized behavior respects its configured limits.
No enemy continues attacking after death.