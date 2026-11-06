# Ability Implementation and Existing Ability Modifications

## 1. General Requirements

Before making any changes, inspect the existing project architecture and identify how abilities, damage, enemy status effects, cooldowns, charges, visual effects, and flyswatter impacts are currently implemented.

Do not start implementing everything at once. First, analyze the existing code and create an implementation plan.

### Implementation Rules

- Implement one ability or modification at a time.
- After completing each implementation, stop and wait for my approval before proceeding to the next one.
- I will test each implementation before giving approval.
- Do not move on to another ability until I explicitly approve the current one.
- Preserve existing functionality unless a change is explicitly requested below.
- Reuse existing systems whenever possible. Avoid unnecessary duplication.
- All ability-specific scripts, configuration files, and assets must be organized inside that ability's own folder.
- Shared systems and reusable functionality should remain centralized rather than duplicated across ability folders.

### Damage Rules

**Every ability that deals damage must always deal exactly 1 damage per hit.**

This value is universal and must not be configurable.

This applies to all damage sources, including explosions, projectiles, lightning, additional impacts, and secondary effects.

### Cooldown Rules

- Every ability must have a cooldown.
- Cooldowns must be individually configurable.
- The configurable cooldown range must be between 0.25 and 5 seconds.
- Do not assume every ability uses the same cooldown mechanism. Some abilities may use charges, as specified below.

### Configuration and Inspector Usability

Make ability configuration intuitive, centralized, and easy to modify.

I want to be able to find and adjust an ability's parameters without navigating through multiple unrelated scripts or files.

Each ability should expose its relevant parameters clearly, including cooldowns, colors, radii, durations, speeds, intervals, visual settings, and other values specified below.

Avoid hardcoded values whenever they are intended to be configurable.

---

# 2. Reusable Enemy Status Effect: Electrocution

Implement electrocution as a reusable enemy status effect, not as functionality exclusive to a particular ability.

Other abilities must be able to apply this same status effect.

### Behavior

When an enemy becomes electrocuted:

- It becomes completely immobile.
- Its movement stops entirely for 2 seconds.
- It does not receive damage from electrocution itself.
- It displays a visual electrical effect consisting of small sparks or electricity around its body.

### Reapplication

An enemy can be electrocuted again while already electrocuted.

When this happens, the duration must reset to 2 seconds from the moment of reapplication.

The duration must be configurable.

### Visual Configuration

- Default color: turquoise blue, leaning slightly toward light blue.
- The status color must be configurable.
- Small electrical sparks should continuously communicate that the enemy is electrocuted.
- Spark appearance, frequency, and other relevant visual parameters should be configurable.

Do not add erratic movement or other movement modifications.

---

# 3. New Ability: Lightning Pulse

### Activation

Whenever an enemy becomes electrocuted, Lightning Pulse attempts to activate.

### Effect

Generate an electrical explosion centered on the electrocuted enemy.

The explosion damages all valid enemies within its radius.

Each enemy hit receives exactly 1 damage.

### Explosion Radius

Use the existing Drunk Mosquito explosion radius as the reference.

Lightning Pulse's radius must be approximately 10–15% smaller than the Drunk Mosquito explosion radius.

Prefer referencing the existing configured radius rather than duplicating its numeric value. This ensures that changes to the Drunk Mosquito explosion radius are reflected automatically.

### Visual Effects

Use a strong, intense turquoise electric blue.

The explosion must contain two visual elements:

1. A circular expanding shockwave with relatively low opacity.
2. A more prominent electrical explosion with sparks spreading radially outward.

The electrical explosion and radial sparks should be the dominant visual elements. The expanding circular wave should remain subtle.

All visual parameters, including colors, opacity, expansion speed, duration, and spark behavior, should be configurable.

### Charge System

Lightning Pulse must have:

- Maximum charges: 3.
- Recharge time: 0.25 seconds per charge.

Each activation consumes one charge.

Every 0.25 seconds, one charge is restored, up to the maximum of 3 charges.

If no charges are available, Lightning Pulse does nothing when triggered.

The charge system must be configurable and independent of the normal cooldown implementation used by other abilities.

---

# 4. New Ability: Thunderstorm

### Activation

Thunderstorm activates on the next flyswatter impact, following the existing impact-triggered ability system.

### Primary Effect: Lightning Strikes

Generate exactly 3 lightning strikes.

All three strikes must occur simultaneously, without delays or staggered execution.

Each lightning strike must:

- Originate from the top of the screen.
- Travel vertically downward in a straight line.
- Move extremely quickly.
- Target a randomly selected enemy somewhere on the screen.

The three lightning strikes must always select three different enemies.

Each enemy hit receives exactly 1 damage.

### Secondary Effect: Electrical Sparks

Every enemy hit by a lightning strike generates exactly 3 electrical sparks.

Each spark independently searches for a random nearby enemy and travels toward it.

When a spark reaches its target:

- Apply the Electrocution status effect.
- Do not deal any damage.

A spark can target an enemy that is already electrocuted. In that case, the existing electrocution duration must reset to 2 seconds.

Each spark must select its target independently.

### Visual Configuration

The lightning and electrical effects should use colors inspired by the existing Reverse Transfusion ability.

Use a combination of light blue and yellow, but with darker tones than the current Reverse Transfusion visuals.

The following parameters should be configurable:

- Lightning color.
- Secondary spark colors.
- Lightning speed.
- Lightning visual duration.
- Lightning appearance and thickness.
- Spark speed.
- Spark appearance.
- Spark visual duration.
- Target search radius.

### Cooldown

Thunderstorm cooldown: **3.2 seconds**.

This value must be configurable.

---

# 5. New Ability: Impact Rain

### Activation

Impact Rain activates on the next flyswatter impact, following the existing impact-triggered ability system.

### Main Effect

When the player performs an impact with the flyswatter, Impact Rain generates exactly 3 additional impacts at different enemy positions across the screen.

These additional impacts must be staggered:

- First additional impact.
- Wait approximately 200 milliseconds.
- Second additional impact.
- Wait approximately 200 milliseconds.
- Third additional impact.

The interval must be configurable.

### Target Selection

Each additional impact must:

- Select a random enemy currently on screen.
- Execute at that enemy's position.
- Respect a configurable minimum distance between the selected impact positions.

The minimum distance must be configurable.

If the system cannot find targets that satisfy the minimum distance requirement, use whatever valid targets are available.

Do not force invalid target selection.

### Ability Replication

This is the defining mechanic of Impact Rain.

The three additional impacts must reproduce **one randomly selected impact-triggered ability equipped by the player**.

Important rules:

- Select only abilities classified as impact-triggered abilities.
- Select the replicated ability once, not independently for each additional impact.
- All three additional impacts must reproduce the same selected ability.
- Each additional impact must execute the selected ability as if it were a genuine flyswatter impact.
- This includes its damage, special effects, projectiles, explosions, status effects, visual effects, and animations.

The additional impacts must also deal their normal flyswatter impact damage, following the universal damage rule.

### Technical Implementation Requirement

Do not simulate mouse clicks or duplicate the implementation logic of other abilities.

**Reuse the existing flyswatter impact execution system and the existing ability activation pipeline.**

The additional impacts must invoke the same underlying impact and ability execution logic used by real flyswatter impacts.

This is essential to ensure that replicated abilities behave exactly as they normally would.

Avoid creating an infinite activation loop in which Impact Rain triggers itself through its own additional impacts.

### Cooldown

Impact Rain cooldown: **4 seconds**.

This value must be configurable.

---

# 6. Modifications to Existing Abilities

These abilities are already implemented. Modify only the specified behavior and preserve their other existing functionality.

## 6.1. Pressure Bomb

### Current Behavior

Pressure Bomb currently activates every third flyswatter impact.

### Required Change

Replace this activation condition.

Pressure Bomb must now activate automatically every **2.5 seconds**, instead of every third impact.

The interval must be configurable.

Do not change its existing effect, damage, visuals, or other functionality.

## 6.2. Reverse Transfusion

### Current Behavior

Reverse Transfusion is already implemented and deals its existing damage.

### Required Change

Whenever Reverse Transfusion activates on a flyswatter impact:

1. Apply the Electrocution status effect to the affected enemy.
2. Then execute its existing damage behavior.

**Electrocution must be applied before damage is dealt.**

Preserve its existing damage values, visual effects, and other functionality unless a change is strictly necessary to implement this behavior.

Use the shared Electrocution status effect defined in this document.

---

# 7. General Edge Cases

If an ability cannot find valid targets, it must simply do nothing for those missing targets.

Do not:

- Invent targets.
- Force invalid target selection.
- Cause exceptions or crashes.
- Generate unnecessary effects when there are no valid targets.

This rule applies to all new abilities and secondary effects.

For Thunderstorm, if fewer than three distinct enemies are available, only valid distinct targets should be processed.

For Impact Rain, use available valid targets if the minimum distance requirement cannot be satisfied.

For Lightning Pulse, if no valid enemies are within the explosion radius, no damage or additional effects should occur.

---

# 8. Implementation Order

Implement the following tasks in order, one at a time:

1. Reusable Electrocution status effect.
2. Lightning Pulse.
3. Thunderstorm.
4. Impact Rain.
5. Pressure Bomb activation change.
6. Reverse Transfusion electrocution change.

After completing each task:

- Explain what was implemented.
- Identify the configuration parameters and where they can be modified.
- Report any relevant architectural changes.
- Stop and wait for my approval.

Do not implement the next task until I explicitly approve the current one.

If an existing system already provides some of the required functionality, reuse it instead of rebuilding it.

The priority is a clean, maintainable implementation that integrates correctly with the existing game architecture.
