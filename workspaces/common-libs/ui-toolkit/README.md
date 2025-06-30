# @wso2/ui-toolkit

## Getting Started

### Developer Guide

- Run `rush install ` to install all the dependencies including this module.
- To build this module, please run `rush build -o "@wso2/ui-toolkit"` from the root directory.

### Directory Structure

```
ui-toolkit/
  src/
   components/ 
    Component1
     Component1.tsx
     Component1.stories.tsx
    Component2
     Component2.tsx
     Component2.stories.tsx
  styles/
    Sample.tsx
  index.ts
```

### How to add styles

- You can use you can add styles using `"@emotion/styled"` styles in the same component.
- In case if you want to add global styles, you can add them in `src/styles` directory.
- If you want to add other styles related to a component, add to the directory.

### How to develop with storybook

- Run `npm run storybook` from the root directory.
It will open the storybook in `http://localhost:6006/`
- If you get the error '0308010C:digital envelope routines::unsupported' add the following line 
'export NODE_OPTIONS=--openssl-legacy-provider'

