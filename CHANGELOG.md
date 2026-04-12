# Changelog: FlashMob Gaming

## [1.0.0] - 2026-04-05
### Added
- Initial project release with full SDLC documentation.
- Integrated Pong engine with Socket.io real-time communication.
- React-based frontend with components (Game, Scoreboard, QR Join, Controller).
- Modular design system for premium visual aesthetics.
- Configurable ball speed and theme variations.
- Unit testing suite (Vitest) with 100% core logic coverage.
- Docker and Docker Compose configuration for easy deployment.

## [Unreleased]
### Added
- Player counts in playfield corners with team-matching colors and glow effects.
### Fixed
- QR code labels in cinematic rooms now scale proportionally with room element resizing using container query units (cqw/cqh).
- Consistent typography scaling across all cinematic elements including scoreboard and QR portals.
- Fixed unresponsive mobile gyroscope controls by repairing a React closure bug in the orientation listener activation sequence.
- Enabled paddle/unit movement during the "Waiting for Participants" lobby state across all game types to provide immediate control feedback.
- Improved gyroscope ergonomics in Single-Axis games (Brick Burst, Paddle Battle) by implementing multi-axial tilt detection, allowing play in both portrait and landscape postures.
