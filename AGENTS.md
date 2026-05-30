# AGENTS.md — project-rjwm-weixin-uniapp-develop-wsy

> Supplements the root `AGENTS.md`. All root rules apply unless explicitly overridden.

## Module context
- **Purpose**: uni-app WeChat Mini Program for users to browse the menu, add items to the cart, manage addresses, place orders, make WeChat Pay payments, track deliveries, and chat with the AI customer service agent.
- **AppID**: `wxd8f56827b73a4acd`
- **Entry point**: `main.js` / `App.vue`

## Commands
- **Run/Debug**: Open the project folder in **HBuilderX** and run to the **WeChat Developer Tools** emulator.
- **Build**: Use HBuilderX compiler or standard uni-app CLI to package production bundles.

## Module-specific constraints
- 🚫 **MUST NOT** hardcode AppSecret, merchant payment keys, or personal developer credentials in any committed files.
- 🚫 **MUST NOT** commit the local build output directory `unpackage/` to Git.
- 🚫 **MUST NOT** bypass the standard network request wrappers (e.g. `utils/request.js`) to ensure JWT authentication headers are correctly injected.
- ⚠️ **ASK FIRST** before adding third-party plugins in `uni_modules/` or npm packages.
- ⚠️ **ASK FIRST** before restructuring the global page routing configuration in `pages.json`.
- ✅ **ALWAYS** use standard `@dcloudio/uni-ui` component library guidelines for visual harmony.

## Documentation
- Standards: root `docs/1-standards/README.md`
- Constraints: root `docs/2-constraints/`
- Tasks: root `docs/3-tasks/`
