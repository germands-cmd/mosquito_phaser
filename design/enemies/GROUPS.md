# Mosquito Enemies and Formations — Implementation Specification

## 1. Objective

Implement the approved mosquito behaviors and formations in the existing game.

**Implementation must be iterative. Do not implement everything at once.** Implement one item, allow the developer to test it, and only proceed to the next item after it has been reviewed.

The implementation order is:

1. Drunk Mosquito
2. Hematophage Mosquito
3. Zigzag Mosquito — replication effect only
4. V Formation
5. Column Formation
6. Circular Formation
7. Oscillating Swarm

## 2. General Configuration Rules

Use the existing configuration file for mosquito and formation parameters. Do not create a separate configuration system.

### 2.1. Shared conventions

- **Health:** Expressed as the number of hits required to kill a mosquito. A mosquito with 2 health must receive 2 hits to die.
- **Damage:** Expressed exclusively as damage per second (DPS).
- **Movement speed:** Relative to the existing base movement speed of the standard mosquito.
  - Slow: below the standard mosquito's base speed.
  - Normal: equal to the standard mosquito's base speed.
  - Fast: above the standard mosquito's base speed.
- **Size:** Defined using a multiplier relative to the standard mosquito's size.
- **Visual identity:** Each special mosquito must have a clearly distinguishable silhouette, color, and size where applicable.
- **Configurability:** New parameters introduced by this implementation must be configurable in the existing configuration file wherever applicable.

Do not redefine the standard mosquito's base speed or duplicate existing configuration values.

### 2.2. Death and effect processing

- A mosquito's death must be processed only once.
- A mosquito must not trigger its death effects multiple times.
- Approved chain reactions must work correctly, including explosions triggered by other explosions.
- Baby mosquitoes must not trigger mosquito-generation effects.
- These restrictions must not prevent approved chain reactions between eligible non-baby mosquitoes.

---

# 3. Individual Mosquitoes

## 3.1. Drunk Mosquito

### Configuration

| Parameter         | Value                                            |
| ----------------- | ------------------------------------------------ |
| Health            | 2 hits                                           |
| Movement speed    | Below standard mosquito speed                    |
| Size multiplier   | 1.0                                              |
| Damage            | 2 DPS                                            |
| Visual color      | Blue or purple; choose a suitable implementation |
| Movement behavior | Smooth, erratic flight                           |
| Explosion radius  | Fixed radius, independent of mosquito size       |

The explosion radius must be configurable in the existing configuration file.

### Movement

The Drunk Mosquito flies in an erratic, smooth pattern across the screen.

- Its movement should appear unpredictable, with broad oscillations.
- It must not follow a direct path toward the player's legs.
- Its movement speed must be lower than that of the standard mosquito.
- It must eventually reach the player's legs and begin dealing damage according to the existing mosquito attack system.

The purpose of this movement is to make the mosquito harder to hit through unpredictable positioning rather than high speed.

### Death explosion

When the Drunk Mosquito dies, it creates a clearly visible area explosion.

- The explosion must have a fixed radius configured independently of the mosquito's size.
- The explosion's visual effect must use the mosquito's color.
- The explosion must visibly communicate its area of effect.
- All eligible mosquitoes hit by the explosion die.

### Victim selection

The explosion should kill between 3 and 5 eligible mosquitoes whenever possible.

Use the following procedure:

1. Identify all eligible mosquitoes within the explosion radius.
2. Kill all eligible mosquitoes hit by the explosion.
3. Count the eligible mosquitoes killed by the explosion.
4. If fewer than 3 eligible mosquitoes were killed, select additional living, eligible mosquitoes elsewhere on the screen until the total reaches 3, or until no more eligible mosquitoes are available.
5. Do not select additional victims once the desired minimum has been reached.
6. If fewer than 3 eligible mosquitoes are available in total, kill only those available. Do not throw errors or interrupt gameplay.

The minimum and maximum are targets for victim selection, not restrictions on the explosion's natural kills. If the explosion hits more than 5 eligible mosquitoes, all of them must die.

**Eligible mosquitoes:**

- Any living mosquito that is not a baby mosquito, including standard and special variants.
- Baby mosquitoes must never be selected as additional victims.

### Baby generation

Each eligible mosquito killed by the explosion receives the Drunk death effect without
damaging nearby mosquitoes and generates between 1 and 3 baby mosquitoes.

- This applies to eligible mosquitoes killed directly by the explosion.
- It also applies to eligible mosquitoes killed through the additional victim-selection procedure.
- The secondary effect must show the explosion feedback but must not select or damage
  additional mosquitoes.
- Baby mosquitoes must not generate further babies through this mechanic.
- If an explosion kills another Drunk Mosquito, that mosquito must also show the
  secondary Drunk death effect and generate babies, but must not damage nearby
  mosquitoes.

### Configuration requirements

Expose the following parameters through the existing configuration file:

- Health
- Movement speed multiplier or equivalent existing speed setting
- Size multiplier
- Damage per second
- Explosion radius
- Baby spawn minimum
- Baby spawn maximum
- Desired minimum number of eligible victims

Reuse existing configuration conventions where possible.

### Acceptance criteria

- The mosquito has 2 health and deals 2 DPS.
- Its movement is slower than the standard mosquito and follows a smooth, erratic path.
- Its explosion is visibly distinguishable and uses its color.
- The explosion radius remains fixed regardless of mosquito size.
- Eligible victims killed by the explosion generate 1–3 babies each.
- Additional victim selection works when fewer than 3 eligible mosquitoes are hit.
- The game handles insufficient available victims without errors.
- Multiple Drunk Mosquitoes can trigger successive explosions.
- Baby mosquitoes do not generate more babies through this mechanic.

---

## 3.2. Hematophage Mosquito

### Configuration

| Parameter       | Value                                         |
| --------------- | --------------------------------------------- |
| Health          | 3 hits                                        |
| Movement speed  | Considerably below standard mosquito speed    |
| Size multiplier | Greater than 1.0                              |
| Damage          | 5 DPS                                         |
| Silhouette      | More square-shaped than the standard mosquito |

The exact movement speed and size multipliers must be configurable. Choose reasonable initial values for testing without changing the standard mosquito's existing base values.

### Movement and appearance

- The Hematophage Mosquito moves considerably slower than the standard mosquito.
- It must be visibly larger than the standard mosquito.
- Its silhouette must be more square-shaped.
- Its visual appearance must clearly distinguish it from other mosquito types.

Its slow movement gives the player an opportunity to intercept it before it reaches the legs.

### Baby-generation effect

While at least one Hematophage Mosquito remains on screen, every living non-baby
mosquito death generates 2 baby mosquitoes.

Rules:

- The effect has no generation limit.
- The Hematophage Mosquito does not need to be close to the mosquito that dies.
- The effect applies to every non-baby mosquito death, including standard mosquitoes,
  special variants, explosions, and chain reactions.
- Baby mosquito deaths do not trigger this effect.
- Baby mosquitoes generated by this effect must not trigger further mosquito-generation effects.

If multiple Hematophage Mosquitoes are present, each active Hematophage Mosquito applies its own effect to eligible deaths. For example, if two Hematophage Mosquitoes are on screen when one eligible mosquito dies, each generates 2 babies.

### Configuration requirements

Expose the following parameters through the existing configuration file:

- Health
- Movement speed multiplier or equivalent existing speed setting
- Size multiplier
- Damage per second
- Number of babies generated per eligible death

### Acceptance criteria

- The mosquito has 3 health and deals 5 DPS.
- It moves considerably slower than the standard mosquito.
- It is larger and more square-shaped.
- Each eligible mosquito death while it remains on screen generates 2 babies.
- The effect works for deaths caused by explosions.
- Baby mosquito deaths do not trigger generation.
- There is no generation cap.
- Multiple Hematophage Mosquitoes apply their effects independently.

---

## 3.3. Zigzag Mosquito — Replication Effect Only

The Zigzag Mosquito is already implemented, configured, and working correctly.

**Do not modify its existing movement, health, size, speed, damage, appearance, or configuration.** Only implement the replication effect described below.

### Replication behavior

The original Zigzag Mosquito has 2 health.

When the original receives its first hit:

1. The original loses 1 health according to the existing damage system.
2. It creates one copy of itself.
3. The copy has 1 health.
4. The copy uses the existing Zigzag Mosquito movement behavior.
5. The copy cannot replicate.

The original retains its remaining health and dies when it receives the next hit.

### Replication restrictions

- Only the original mosquito can replicate.
- Replication occurs only once, on the original's first hit.
- The copy must never create another copy.
- The copy must use the existing zigzag movement implementation.
- The replication effect must not alter any existing behavior unrelated to replication.

Ensure the original cannot accidentally replicate multiple times if several hits are processed in rapid succession.

### Acceptance criteria

- The original has the same behavior as before this change.
- Its first hit creates exactly one copy with 1 health.
- The original retains its remaining health.
- The copy cannot replicate.
- The original dies normally when its remaining health is depleted.
- No other existing properties or behaviors are changed.

---

# 4. Mosquito Formations

## 4.1. General Formation Rules

Formations are groups of standard mosquitoes that move together as a single unit.

- Formation members must be standard mosquitoes, not special mosquitoes.
- All members of a formation share a common movement speed.
- Formations must preserve their recognizable structure while traveling.
- Formation sizes must follow the specified allowed values or ranges.
- Formation parameters must be configurable in the existing configuration file wherever applicable.
- Do not add special mosquito behaviors to formation members.
- Individual spreading or separation should occur only where explicitly described below.

### Formation spacing

The intended spacing between adjacent mosquitoes is approximately **10% of the standard mosquito's size**.

Implement this as the spacing parameter used by the formation system. Ensure the resulting formation remains visually recognizable and that mosquitoes do not unintentionally overlap.

---

## 4.2. V Formation

### Configuration

| Parameter      | Value                                       |
| -------------- | ------------------------------------------- |
| Group size     | Randomly choose 5 or 7 mosquitoes           |
| Mosquito type  | Standard mosquito only                      |
| Movement speed | Shared by the entire formation              |
| Spacing        | Approximately 10% of standard mosquito size |

### Movement

- The group spawns in a recognizable V shape.
- All members move together at the same speed.
- The formation maintains its V shape during travel.
- When the formation reaches the legs, it breaks formation slightly.
- Members spread out enough to occupy different positions on the legs and begin attacking.

The formation must remain recognizable during its approach and must not behave like a loose collection of independent mosquitoes.

### Acceptance criteria

- The formation contains either 5 or 7 standard mosquitoes.
- The group moves at a shared speed.
- The V shape remains recognizable during travel.
- The group spreads slightly when it reaches the legs.
- Individual mosquitoes can then occupy separate positions and attack.

---

## 4.3. Column Formation

### Configuration

| Parameter      | Value                                                   |
| -------------- | ------------------------------------------------------- |
| Group size     | Randomly selected between 3 and 9 mosquitoes, inclusive |
| Mosquito type  | Standard mosquito only                                  |
| Movement speed | Shared by the entire formation                          |
| Spacing        | Approximately 10% of standard mosquito size             |

### Movement

- The group spawns as a recognizable column, with mosquitoes following one another.
- The group moves together at a common speed.
- Members maintain relatively constant spacing during travel.
- When the formation reaches the legs, the column opens slightly toward the sides.
- Members then spread out to occupy different positions and begin attacking.

### Acceptance criteria

- The formation contains between 3 and 9 standard mosquitoes.
- The column remains recognizable during travel.
- Members maintain consistent spacing.
- The group shares a common movement speed.
- The column opens slightly when it reaches the legs.

---

## 4.4. Circular Formation

### Configuration

| Parameter      | Value                                  |
| -------------- | -------------------------------------- |
| Group size     | Randomly choose 6, 8, or 10 mosquitoes |
| Mosquito type  | Standard mosquito only                 |
| Movement speed | Shared by the entire formation         |
| Circle radius  | 1.5 times the standard mosquito size   |

The circle radius must be configurable.

### Movement

- The group spawns in a recognizable circular formation.
- Members maintain their circular arrangement while traveling toward the legs.
- The formation must not gradually transition into another formation during its approach.

### Arrival and release

When the circular formation reaches, or is about to reach, its assigned leg,
all members release individually toward separate targets on that same leg.
Each mosquito occupies a separate position and begins attacking.

### Acceptance criteria

- The formation contains 6, 8, or 10 standard mosquitoes.
- The circle remains recognizable during travel.
- The radius is configurable and initially set to 1.5 times the standard mosquito size.
- All members attack the same assigned leg.
- Members spread individually on that leg.

---

## 4.5. Oscillating Swarm

### Configuration

| Parameter              | Value                                           |
| ---------------------- | ----------------------------------------------- |
| Initial group size     | 4, 8, or 12 mosquitoes                          |
| Mosquito type          | Standard mosquito only                          |
| Movement speed         | Shared by the entire group                      |
| Oscillation             | Independent lateral oscillation per mosquito    |
| Arrival synchronization | Configurable narrow arrival window              |

The initial group size must be randomly selected from the allowed values: 4, 8, or 12.

### Initial movement

- The swarm begins as one compact, recognizable group.
- All members travel together at the same speed.
- The group follows its intended route toward the player's legs.

### Oscillating movement

- Each mosquito moves independently toward the player's legs with a smooth lateral oscillation.
- Each member receives configurable random variations in speed, amplitude, frequency, phase, and oscillation direction.
- The members remain visually grouped while traveling, but their independent movement makes it difficult to swat the whole formation at once.
- Individual travel durations are constrained to a configurable narrow arrival window so the group reaches the leg almost together.

### Acceptance criteria

- The initial group contains 4, 8, or 12 standard mosquitoes.
- The group initially appears compact and apelotonado.
- Each mosquito oscillates independently while remaining close to the group route.
- Speed, amplitude, frequency, phase, direction, and arrival-window parameters are configurable.
- All members reach the leg within the configured narrow arrival window.

---

# 5. Configuration and Implementation Requirements

## 5.1. Existing configuration system

Use the existing configuration file and existing configuration conventions.

Do not create a second configuration system, duplicate the standard mosquito's base settings, or hardcode values that are intended to be configurable.

Add only the new parameters required for the approved behaviors and formations.

Examples of new parameters include:

- Drunk Mosquito explosion radius.
- Hematophage Mosquito baby-generation count.
- Formation group-size options.
- Formation spacing and circular radius.
- Any new speed or size multipliers required by the new mosquito types.

Preserve all existing settings for already implemented mosquito types.

## 5.2. Death processing and chain reactions

The implementation must support recursive-looking effects without processing the same death more than once.

For example:

1. A Drunk Mosquito dies and explodes.
2. Its explosion kills an eligible mosquito.
3. That mosquito's death is processed normally.
4. If the victim is another Drunk Mosquito, it triggers its own explosion.
5. The second explosion can kill additional eligible mosquitoes and trigger further effects.

The system must allow this behavior without infinite loops caused by duplicate death events.

Baby mosquitoes are excluded from mosquito-generation effects. Their deaths must not trigger the Hematophage Mosquito's generation effect or the Drunk Mosquito's baby-generation effect.

## 5.3. Scope protection

- Do not modify existing Zigzag Mosquito properties other than adding the replication effect.
- Do not redesign the standard mosquito's movement, damage, health, speed, size, or appearance.
- Do not introduce additional mosquito types, formations, abilities, or mechanics.
- Do not implement every item in one pass.
- Do not change unrelated game systems.

---

# 6. Mandatory Iterative Implementation Workflow

Implementation must follow this exact workflow.

## Stage 1 — Drunk Mosquito

Implement only the Drunk Mosquito and its configuration.

Test its movement, health, damage, explosion visuals, victim selection, baby generation, and chain reactions.

Stop and wait for developer review before continuing.

## Stage 2 — Hematophage Mosquito

Implement only the Hematophage Mosquito and its configuration.

Test its movement speed, size, silhouette, health, damage, baby generation, and interactions with explosions.

Stop and wait for developer review before continuing.

## Stage 3 — Zigzag Mosquito Replication

Implement only the replication effect.

Do not change any existing Zigzag Mosquito behavior or configuration.

Test the original's first-hit replication, the copy's health, and the restriction preventing the copy from replicating.

Stop and wait for developer review before continuing.

## Stage 4 — V Formation

Implement only the V Formation.

Test group size, shared movement speed, spacing, formation preservation, and spreading on arrival.

Stop and wait for developer review before continuing.

## Stage 5 — Column Formation

Implement only the Column Formation.

Test group size, shared movement speed, spacing, column preservation, and spreading on arrival.

Stop and wait for developer review before continuing.

## Stage 6 — Circular Formation

Implement only the Circular Formation.

Test group size, circle radius, formation preservation, equal movement speed, and individual spreading on arrival.

Stop and wait for developer review before continuing.

## Stage 7 — Oscillating Swarm

Implement only the Oscillating Swarm.

Test initial group sizes, compact spawning, independent oscillation, arrival synchronization, and resistance to a single swat.

Stop and wait for developer review before considering the implementation complete.

---

# 7. Final Acceptance Criteria

The implementation is complete when:

- Every approved mosquito behavior works as specified.
- Every approved formation works as specified.
- All new parameters are integrated into the existing configuration system.
- Existing functionality remains unchanged except where explicitly required.
- Baby mosquitoes do not trigger the excluded generation effects.
- Approved explosion chain reactions work reliably.
- No mosquito death or death effect is processed more than once.
- Each implementation stage has been tested and reviewed before the next stage begins.

**Important:** Do not proceed automatically from one stage to the next. Complete one stage, report what was changed and what should be tested, and wait for explicit approval to continue.
