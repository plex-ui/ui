import { isTest } from "../../lib/environment"

// By default, all tests will treat <TransitionGroup> as `disableAnimations={true}`,
// removing the need to be aware of misc. async animations happening across tests.
export default () => isTest
