import Phaser from "phaser";
import { createAbilityIcon } from "../../abilities/IconRenderer.js";

/**
 * AbilitySelectionOverlay.js
 * Modal overlay displayed at the start of each phase before the phase timer starts.
 * Presents up to 3 random unequipped abilities.
 * Highlights the chosen ability with a white border.
 * Enables the confirm button once an ability is selected (or immediately if no options remain).
 */
export class AbilitySelectionOverlay {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} callbacks
   * @param {Function} callbacks.onConfirm - Called with selected ability definition (or null if none)
   */
  constructor(scene, callbacks = {}) {
    this.scene = scene;
    this.callbacks = callbacks;

    this.container = scene.add.container(0, 0).setDepth(50).setVisible(false);
    this.selectedOption = null;
    this.cardViews = [];
    this.currentOptions = [];

    this.build();
  }

  build() {
    const { width, height } = this.scene.scale;
    const cx = width / 2;
    const cy = height / 2;

    // 1. Semi-transparent dark background
    this.dimBg = this.scene.add.graphics();
    this.dimBg.fillStyle(0x0e0806, 0.92);
    this.dimBg.fillRect(0, 0, width, height);
    this.container.add(this.dimBg);

    // 2. Central modal panel frame
    const panelW = 760;
    const panelH = 460;
    this.panelBg = this.scene.add.graphics();
    this.panelBg.fillStyle(0x19100d, 0.98);
    this.panelBg.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 14);
    this.panelBg.lineStyle(2.5, 0x4a2e1d, 1);
    this.panelBg.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 14);
    this.container.add(this.panelBg);

    // 3. Header Texts
    this.titleText = this.scene.add.text(cx, cy - panelH / 2 + 42, "PHASE 1: CHOOSE AN ABILITY", {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: "32px",
      color: "#f0d7bf",
      stroke: "#1a0806",
      strokeThickness: 5,
      resolution: 2,
    }).setOrigin(0.5);

    this.subtitleText = this.scene.add.text(
      cx,
      cy - panelH / 2 + 78,
      "Choose 1 ability to acquire for the rest of the run:",
      {
        fontFamily: "sans-serif",
        fontSize: "15px",
        color: "#c2ab97",
        resolution: 2,
      }
    ).setOrigin(0.5);

    this.container.add([this.titleText, this.subtitleText]);

    // 4. Container for dynamic ability cards
    this.cardsContainer = this.scene.add.container(0, 0);
    this.container.add(this.cardsContainer);

    // 5. Message when no abilities are available
    this.emptyMessageText = this.scene.add.text(
      cx,
      cy + 10,
      "No more abilities available to choose from.\nAll available abilities have been acquired.",
      {
        fontFamily: "sans-serif",
        fontSize: "20px",
        color: "#b09c8d",
        align: "center",
        lineSpacing: 10,
        resolution: 2,
      }
    ).setOrigin(0.5).setVisible(false);
    this.container.add(this.emptyMessageText);

    // 6. Confirm Button
    this.confirmBtnY = cy + panelH / 2 - 50;
    this.confirmBtnW = 240;
    this.confirmBtnH = 50;
    this.confirmBtnX = cx;

    this.confirmBtnBg = this.scene.add.graphics();
    this.confirmBtnText = this.scene.add.text(cx, this.confirmBtnY, "CONFIRM", {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: "22px",
      color: "#ffffff",
      resolution: 2,
    }).setOrigin(0.5);

    this.confirmHitZone = this.scene.add
      .zone(cx, this.confirmBtnY, this.confirmBtnW, this.confirmBtnH)
      .setInteractive({ cursor: "pointer" });

    this.confirmHitZone.on("pointerdown", () => this.handleConfirmClick());

    this.container.add([this.confirmBtnBg, this.confirmBtnText, this.confirmHitZone]);
  }

  /**
   * Displays the selection modal.
   * @param {Object} params
   * @param {number} params.phaseNumber - Phase number (1 to 5)
   * @param {Array} params.options - Array of available ability definitions (up to 3)
   */
  show({ phaseNumber = 1, options = [] }) {
    this.selectedOption = null;
    this.currentOptions = options;

    this.titleText.setText(`PHASE ${phaseNumber}: CHOOSE AN ABILITY`);

    // Clean up previously rendered cards
    this.clearCards();

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    if (!options || options.length === 0) {
      // No abilities left in pool
      this.subtitleText.setText("No more abilities available for this phase.");
      this.emptyMessageText.setVisible(true);
      this.updateConfirmButton(true, "CONTINUE");
    } else {
      this.subtitleText.setText("Choose 1 ability to acquire for the rest of the run:");
      this.emptyMessageText.setVisible(false);
      this.renderOptionCards(cx, cy + 10, options);
      this.updateConfirmButton(false, "CONFIRM");
    }

    this.container.setVisible(true);
  }

  /**
   * Renders up to 3 interactive ability cards.
   * @param {number} cx
   * @param {number} cy
   * @param {Array} options
   */
  renderOptionCards(cx, cy, options) {
    const cardW = 200;
    const cardH = 220;
    const gap = 24;
    const count = options.length;
    const totalW = count * cardW + (count - 1) * gap;
    const startX = cx - totalW / 2 + cardW / 2;

    this.cardViews = options.map((option, index) => {
      const cardX = startX + index * (cardW + gap);
      const cardY = cy;

      const cardContainer = this.scene.add.container(cardX, cardY);
      const bg = this.scene.add.graphics();
      cardContainer.add(bg);

      // Icon symbol (supports raw SVG markup or emoji/text)
      const iconHandler = createAbilityIcon(
        this.scene,
        cardContainer,
        0,
        -60,
        option.iconSymbol || "✨",
        56,
        option.id
      );

      // Name
      const nameText = this.scene.add.text(0, -10, option.name, {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: "18px",
        color: "#ffffff",
        align: "center",
        resolution: 2,
      }).setOrigin(0.5);
      cardContainer.add(nameText);

      // Description
      const descText = this.scene.add.text(0, 45, option.description, {
        fontFamily: "sans-serif",
        fontSize: "13px",
        color: "#c4b09f",
        align: "center",
        wordWrap: { width: cardW - 24 },
        lineSpacing: 4,
        resolution: 2,
      }).setOrigin(0.5);
      cardContainer.add(descText);

      // Interactive hit zone
      const zone = this.scene.add
        .zone(0, 0, cardW, cardH)
        .setInteractive({ cursor: "pointer" });

      zone.on("pointerdown", () => this.selectOption(option));

      zone.on("pointerover", () => {
        if (this.selectedOption?.id !== option.id) {
          this.drawCardBackground(bg, cardW, cardH, option, "hover");
        }
      });

      zone.on("pointerout", () => {
        if (this.selectedOption?.id !== option.id) {
          this.drawCardBackground(bg, cardW, cardH, option, "normal");
        }
      });

      cardContainer.add(zone);
      this.cardsContainer.add(cardContainer);

      const view = { option, cardContainer, bg, cardW, cardH, zone, iconHandler };
      this.drawCardBackground(bg, cardW, cardH, option, "normal");
      return view;
    });
  }

  /**
   * Draws the background and border of an ability card.
   * Highlights with a prominent white border when selected.
   * @param {Phaser.GameObjects.Graphics} bg
   * @param {number} cardW
   * @param {number} cardH
   * @param {Object} option
   * @param {"normal"|"hover"|"selected"} state
   */
  drawCardBackground(bg, cardW, cardH, option, state) {
    bg.clear();
    const halfW = cardW / 2;
    const halfH = cardH / 2;

    if (state === "selected") {
      // Highlighted card: slightly brighter inner background and thick WHITE border
      bg.fillStyle(0x361a12, 1);
      bg.fillRoundedRect(-halfW, -halfH, cardW, cardH, 12);
      bg.lineStyle(3.5, 0xffffff, 1); // Borde blanco
      bg.strokeRoundedRect(-halfW, -halfH, cardW, cardH, 12);
    } else if (state === "hover") {
      bg.fillStyle(0x28160f, 1);
      bg.fillRoundedRect(-halfW, -halfH, cardW, cardH, 12);
      bg.lineStyle(2, 0x8a5533, 1);
      bg.strokeRoundedRect(-halfW, -halfH, cardW, cardH, 12);
    } else {
      bg.fillStyle(0x1e120c, 0.95);
      bg.fillRoundedRect(-halfW, -halfH, cardW, cardH, 12);
      bg.lineStyle(1.5, 0x4a2e1d, 0.9);
      bg.strokeRoundedRect(-halfW, -halfH, cardW, cardH, 12);
    }
  }

  /**
   * Selects an ability option and updates card visuals and confirm button state.
   * @param {Object} option
   */
  selectOption(option) {
    this.selectedOption = option;

    // Refresh border styling for all cards (only selected gets white border)
    for (const view of this.cardViews) {
      const isSelected = view.option.id === option.id;
      this.drawCardBackground(
        view.bg,
        view.cardW,
        view.cardH,
        view.option,
        isSelected ? "selected" : "normal"
      );
    }

    // Enable confirm button
    this.updateConfirmButton(true, "CONFIRM");
  }

  /**
   * Updates visual appearance and interactive state of the confirm button.
   * @param {boolean} isEnabled
   * @param {string} [label="CONFIRM"]
   */
  updateConfirmButton(isEnabled, label = "CONFIRM") {
    this.isConfirmEnabled = isEnabled;
    this.confirmBtnText.setText(label);

    const bx = this.confirmBtnX;
    const by = this.confirmBtnY;
    const bw = this.confirmBtnW;
    const bh = this.confirmBtnH;

    this.confirmBtnBg.clear();

    if (isEnabled) {
      this.confirmBtnBg.fillStyle(0x942216, 1);
      this.confirmBtnBg.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 10);
      this.confirmBtnBg.lineStyle(2.5, 0xffeedd, 1);
      this.confirmBtnBg.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 10);
      this.confirmBtnText.setColor("#ffffff");
      this.confirmHitZone.input.cursor = "pointer";
    } else {
      this.confirmBtnBg.fillStyle(0x241813, 0.85);
      this.confirmBtnBg.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 10);
      this.confirmBtnBg.lineStyle(1.5, 0x3d281f, 0.7);
      this.confirmBtnBg.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 10);
      this.confirmBtnText.setColor("#6e5a4d");
      this.confirmHitZone.input.cursor = "default";
    }
  }

  handleConfirmClick() {
    if (!this.isConfirmEnabled) return;

    if (this.callbacks.onConfirm) {
      this.callbacks.onConfirm(this.selectedOption);
    }
  }

  clearCards() {
    for (const view of this.cardViews) {
      if (view.iconHandler) view.iconHandler.destroy();
      view.cardContainer.destroy();
    }
    this.cardViews = [];
  }

  hide() {
    this.container.setVisible(false);
    this.clearCards();
    this.selectedOption = null;
  }

  isVisible() {
    return this.container.visible;
  }

  destroy() {
    this.clearCards();
    this.container.destroy();
  }
}
