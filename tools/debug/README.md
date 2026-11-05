# Debug tools

This entry point keeps development-only controls outside `src`.

Open the tool with Vite:

```bash
npx vite --host
```

Then visit `http://localhost:5173/tools/debug/`.

The tools are organized by capability:

- `hud/`: debug HUD.
- `colliders/`: leg polygon visualization.
- `test-mode/`: automatic spawn toggle.
- `enemy-tests/`: individual enemy variants.
- `formations/`: formation spawning.
- `phases/`: independent phase selection.
