# Ichik Editor 📝
A lightweight, secure, and dependency-free **WYSIWYG Editor** built with Vanilla JavaScript. Designed for modern web applications that need rich text editing with **Markdown export** capabilities, internationalization (i18n), and a clean user experience. Ichik means "small" in Quechua, the language of the Incas.

## ✨ Key Features
- **Zero Dependencies:** Built entirely in Vanilla JS (ES6+) and CSS3. No frameworks, no bloat.
- **Markdown Export:** Converts rich HTML content directly into clean Markdown format.
- **Secure by Design:**
  - **XSS Protection:** Output sanitization prevents Stored XSS attacks.
  - **HTTPS Enforcement:** Validates links and images to ensure secure protocols.
- **Rich UI Components:**
  - **Custom Popups:** Replaces native browser `prompt()` with styled, non-blocking forms for Links and Images.
  - **Emoji Picker:** Integrated grid-based emoji selector.
  - **Floating Tooltips:** Shows link destinations on hover.
- **Smart UX:**
  - **Active States:** Toolbar buttons highlight based on the cursor position (e.g., Bold is active when clicking on bold text).
  - **Mobile Responsive:** Popups and pickers automatically adjust their position to stay within the viewport.
  - **Image & Link Editing:** Click on an existing image or link to modify it instead of deleting and recreating.
- **Multi-Instance:** Support for multiple editors on the same page without conflicts.
- **i18n Ready:** Fully configurable text labels for easy translation into any language.


## ⌨️ Try it out!
- [English DEMO](https://html-preview.github.io/?url=https://github.com/swilsont/ichik-editor/blob/main/demo.html)
- [Spanish DEMO](https://html-preview.github.io/?url=https://github.com/swilsont/ichik-editor/blob/main/demo_es.html)


## 🚀 Installation
Simply include the CSS and JS files in your project.

```HTML
<link rel="stylesheet" href="ichik-editor-1.0.0.min.css">
```

```HTML
<script src="ichik-editor-1.0.0.min.js"></script>
```

## 📖 Usage
### 1. HTML Structure
Create a container `div` where the editor will be initialized.

```HTML
<div id="my-editor"></div>
```

### 2. Initialization
Initialize the editor by passing the selector ID.

```JavaScript
// Initialize with default settings (English)
const editor = new IchikEditor('#my-editor');
```

### 3. Getting Data
To retrieve the content, use the public API methods:

```JavaScript
// Get content as Markdown string
const markdown = editor.getMarkdown();
console.log(markdown);

// Get content as HTML
const html = editor.getHTML();
console.log(html);

// Set HTML content (e.g., loading from database)
editor.setHTML('<p>Welcome back!</p>');
```

## 🌍 Internationalization (i18n) & Configuration
You can customize all text labels, titles, and placeholders by passing a configuration object as the second argument. This allows for full translation.

### Example: Spanish Configuration

```JavaScript
const spanishConfig = {
    labels: {
        toolbar: {
            formats: {
                normal: 'Párrafo normal',
                h1: 'Título 1',
                h2: 'Título 2',
                h3: 'Título 3'
            },
            bold: '<strong>N</strong>', // Negrita
            italic: '<em>K</em>', // Cursiva
            ul: '• Lista de viñetas',
            ol: '1. Lista numerada',
            hr: '—',
            link: '🔗 Enlace',
            image: '🖼️ Imagen',
            emoji: '😀 Agregar Emoji',
            clear: 'Quitar formato'
        },
        popups: {
            link: {
                title: 'URL del Enlace',
                placeholder: 'https://...',
                cancel: 'Cancelar',
                save: 'Guardar'
            },
            image: {
                titleUrl: 'URL de Imagen',
                titleAlt: 'Descripción (Alt Text, opcional)',
                titleWidth: 'Ancho (Opcional)',
                insert: 'Insertar',
                update: 'Actualizar',
                cancel: 'Cancelar'
            }
        },
        alerts: {
            httpsRequired: 'Por seguridad, use solo HTTPS.',
            invalidProtocol: 'Protocolo no válido.'
        }
    }
};

const editorES = new IchikEditor('#my-editor', spanishConfig);
```

## 🔒 Security Features
Ichik Editor takes security seriously:

1. **Output Sanitization:** The `getMarkdown()` method escapes HTML characters (`<`, `>`, `&`, `"`, `'`) in text nodes. This ensures that if a user types `<script>alert(1)</script>`, it is rendered as text, not executed as code.
2. **Strict URL Validation:** When adding links or images, the editor enforces `https://` and blocks dangerous protocols like `javascript:` or `data:`.

## 🛠 Architecture
The project uses the **Module Pattern (IIFE/Closure)**.
- **Encapsulation:** Internal helper functions and variables are hidden from the global scope.
- **Minification Friendly:** Internal functions can be aggressively renamed by minifiers without breaking the public API.
- **Clean Namespace:** Only `IchikEditor` is exposed to the `window` object.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE file](https://github.com/swilsont/ichik-editor/blob/main/LICENSE) for details.

---

Made with ❤️ in Chile using Vanilla JS.
