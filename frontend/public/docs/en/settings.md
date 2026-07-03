# Settings

![Settings modal](/docs/screenshots/settings-modal.png)

The Settings modal (⚙️ icon in the header, admin only) lets you configure the app's language, appearance, and admin password.

## Language

Choose **English** or **Slovenčina** (Slovak). The switch takes effect immediately — the entire app UI is translated.

## Theme

Three themes are available:

- **Light** — light background with dark text, default
- **Dark** — dark background with light text, for use in dim lighting
- **High Contrast** — pure black-on-white, designed for e-ink displays and outdoor readability

## Admin password

The default admin password is `admin`. To change it:

1. Enter your **current password**.
2. Enter a **new password** (at least 10 characters).
3. **Confirm** the new password.

The password is hashed on the server. Changing it does not affect admin sessions that are already logged in — it only applies to future logins.

## Audit log

The **Audit log** section at the bottom of the Settings modal lets you view every administrative and scoring action recorded by the app. Click **View Audit Log** to open it. See [Audit log](audit.md) for details on filtering, pagination, and the list of tracked actions.
