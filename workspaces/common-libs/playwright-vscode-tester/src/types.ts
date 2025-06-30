type BrowserName = 'electron' | 'chrome' | 'chromium' | 'firefox' | 'edge' | string

type BrowserChannel = 'stable' | 'canary' | 'beta' | 'dev' | 'nightly' | string

type BrowserFamily = 'chromium' | 'firefox' | 'webkit'

/**
   * Describes the browser
   */
export interface Browser {
    /**
     * Short browser name.
     */
    name: BrowserName
    /**
     * The underlying engine for this browser.
     */
    family: BrowserFamily
    /**
     * The release channel of the browser.
     */
    channel: BrowserChannel
    /**
     * Human-readable browser name.
     */
    displayName: string
    version: string
    majorVersion: number | string
    path: string
    isHeaded: boolean
    isHeadless: boolean
    /**
     * Informational text to accompany this browser. Shown in desktop-gui.
     */
    info?: string
    /**
     * Warning text to accompany this browser. Shown in desktop-gui.
     */
    warning?: string
    /**
     * The minimum majorVersion of this browser supported by Cypress.
     */
    minSupportedVersion?: number
    /**
     * If `true`, this browser is too old to be supported by Cypress.
     */
    unsupportedVersion?: boolean
}

export interface BrowserLaunchOptions {
    extensions: string[]
    preferences: { [key: string]: any }
    args: string[]
    env: { [key: string]: any }
}
