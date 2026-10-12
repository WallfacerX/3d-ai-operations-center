import { Component } from 'react'

export default class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div className="scene-message" role="alert"><strong>The 3D view could not load.</strong><p>Check WebGL support and that models/desk.glb is available. The simulation and inspector remain usable.</p><button type="button" onClick={() => window.location.reload()}>Reload demo</button></div>
    return this.props.children
  }
}
