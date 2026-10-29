# Change to the Health System and Mosquito Behavior

## 1. Current System

- The player has **100 health points**.
- When a standard mosquito reaches the player's leg and successfully bites, it deals **4 damage** and then disappears.
- This allows the player to survive up to 25 standard mosquito bites before dying.

## 2. New Feeding Behavior

When a standard mosquito reaches the player's leg:

- Instead of biting once and disappearing, it should **remain attached to the leg and continue feeding on the player's blood**.
- While feeding, it deals **1 damage every full second** to the player's health.
- Damage is applied in discrete one-second intervals, not continuously. Partial seconds must not cause partial damage.
- Each mosquito feeding on the player deals its own damage independently. For example, three mosquitoes feeding simultaneously deal a total of 3 damage per second.
- The mosquito remains attached until it is killed.
- The mosquito can be swatted and killed normally while feeding, just as it can in any other state.
- When killed, the mosquito should simply disappear and immediately stop dealing damage. No additional death behavior is required.

## 3. Behavior While Feeding

While attached to the player's leg and feeding:

- The mosquito must stop its normal wing-flapping animation used during flight.
- Its usual buzzing sound must stop completely.
- Its wings should still make **very subtle, gentle movements at randomized intervals**.
- These movements should be soft and natural, rather than resembling continuous flight animation.
- The intervals between wing movements should vary randomly to avoid a repetitive or mechanical pattern.

## 4. Health System

- Keep the player's maximum health at **100 points**.
- Replace the current single 4-damage bite with **1 damage per full second for each standard mosquito feeding on the player**.
- Do not change the existing health system beyond this damage behavior.
- Do not modify the behavior of other mosquito types unless explicitly specified.

## 5. Expected Result

Mosquitoes that reach the player's legs remain attached and continue to threaten the player's health until they are swatted. This creates an opportunity for the player to react and eliminate them before they cause too much damage.

While feeding, mosquitoes should appear relatively still, with occasional subtle wing movements and no buzzing sound.

The goal is to make feeding mosquitoes persistent, vulnerable threats that the player can actively deal with, rather than enemies that inflict a single hit and immediately disappear.
