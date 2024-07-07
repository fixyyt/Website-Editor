document.addEventListener('DOMContentLoaded', () => {
    let currentFile = null;
    const files = {};

    // Initialize CodeMirror editor
    const codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        lineNumbers: true,
        theme: 'default',
        autoCloseTags: true,
        mode: 'htmlmixed',
        extraKeys: {
            "Ctrl-J": "toMatchingTag",
            "Tab": function(cm) {
                const cursor = cm.getCursor();
                const token = cm.getTokenAt(cursor);
                if (token.string === "!") {
                    insertTemplate(cm, cursor);
                } else if (/\w+([.#]\w+)?\*\d+/.test(token.string)) {
                    expandAbbreviation(cm, cursor, token.string);
                } else {
                    cm.execCommand("defaultTab");
                }
            }
        }
    });

    // Function to insert a template based on file type
    function insertTemplate(cm, cursor) {
        const mode = cm.getOption('mode');
        let template = '';

        if (mode === 'htmlmixed') {
            template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>`;
        }
        // Remove the "!" character
        cm.replaceRange('', { line: cursor.line, ch: cursor.ch - 1 }, cursor);

        // Insert the template at the cursor position
        cm.replaceRange(template, { line: cursor.line, ch: cursor.ch - 1 });
    }

    // Function to expand abbreviations like tag.class*4 or tag#id*4
    function expandAbbreviation(cm, cursor, abbreviation) {
        const match = abbreviation.match(/(\w+)([.#]\w+)?\*(\d+)/);
        if (match) {
            const tagName = match[1];
            const identifier = match[2] || '';
            const count = parseInt(match[3], 10);
            let expanded = '';

            const identifierType = identifier.startsWith('.') ? 'class' : identifier.startsWith('#') ? 'id' : '';
            const identifierValue = identifier.slice(1);

            for (let i = 0; i < count; i++) {
                expanded += `<${tagName}${identifierType ? ` ${identifierType}="${identifierValue}"` : ''}></${tagName}>\n`;
            }

            cm.replaceRange(expanded, { line: cursor.line, ch: cursor.ch - abbreviation.length }, cursor);
        }
    }

    // Function to update the live preview
    function updatePreview() {
        const previewFrame = document.getElementById('preview-frame').contentWindow.document;
        previewFrame.open();

        if (currentFile && currentFile.endsWith('.html')) {
            let htmlContent = codeEditor.getValue();

            // Inject styles from linked CSS files
            const styleLinkPattern = /<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/g;
            htmlContent = htmlContent.replace(styleLinkPattern, (match, href) => {
                const fileName = href.trim();
                if (files[fileName] && files[fileName].type === 'css') {
                    return `<style>${files[fileName].content}</style>`;
                }
                return match;
            });

            // Inject scripts from linked JavaScript files
            const scriptSrcPattern = /<script\s+src=["']([^"']+)["']\s*><\/script>/g;
            htmlContent = htmlContent.replace(scriptSrcPattern, (match, src) => {
                const fileName = src.trim();
                if (files[fileName] && files[fileName].type === 'javascript') {
                    return `<script>${files[fileName].content}</script>`;
                }
                return match;
            });

            // Handling <a> tags
            const anchorPattern = /<a\s+href=["']([^"']+)["']\s*>/g;
            htmlContent = htmlContent.replace(anchorPattern, (match, href) => {
                const fileName = href.trim();
                if (files[fileName]) {
                    return `<a href="javascript:void(0);" onclick="parent.loadFile('${fileName}')">`;
                }
                return match;
            });

            // Handling <img> tags
            const imgPattern = /<img\s+src=["']([^"']+)["']\s*\/?>/g;
            htmlContent = htmlContent.replace(imgPattern, (match, src) => {
                const fileName = src.trim();
                if (files[fileName] && files[fileName].type === 'image') {
                    return `<img src="${files[fileName].content}" alt="${fileName}">`;
                }
                return match;
            });

            previewFrame.write(htmlContent);
        } else {
            previewFrame.write(`<pre>${codeEditor.getValue()}</pre>`);
        }
        previewFrame.close();
    }

    window.loadFile = function(fileName) {
        selectFile(fileName);
        updatePreview();
    };

    function changeTheme(theme) {
        codeEditor.setOption('theme', theme);
    }

    function selectFile(fileName) {
        if (currentFile) {
            files[currentFile].content = codeEditor.getValue();
        }
        currentFile = fileName;
        const mode = fileName.endsWith('.html') ? 'htmlmixed' :
                     fileName.endsWith('.css') ? 'css' :
                     fileName.endsWith('.js') ? 'javascript' : 'text/plain';
        codeEditor.setOption('mode', mode);
        codeEditor.setValue(files[fileName]?.content || '');
        document.querySelectorAll('#file-list li').forEach(li => li.classList.remove('selected'));
        document.querySelector(`#file-list li[data-file="${fileName}"]`).classList.add('selected');
        updatePreview();
    }

    function addFile(fileName, fileType, fileContent) {
        if (files[fileName]) return;

        files[fileName] = { type: fileType, content: fileContent };

        const li = document.createElement('li');
        li.textContent = fileName;
        li.setAttribute('data-file', fileName);
        
        // Add delete button next to the file name
        const deleteButton = document.createElement('span');
        deleteButton.textContent = ' 🗑️';
        deleteButton.style.cursor = 'pointer';
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteFile(fileName);
        });

        li.appendChild(deleteButton);

        li.addEventListener('click', () => selectFile(fileName));
        document.getElementById('file-list').appendChild(li);
        selectFile(fileName); // Select the newly added file
    }

    // Function to delete a file
    function deleteFile(fileName) {
        delete files[fileName];
        const liToDelete = document.querySelector(`#file-list li[data-file="${fileName}"]`);
        if (liToDelete) {
            liToDelete.remove();
        }
        if (currentFile === fileName) {
            currentFile = null;
            codeEditor.setValue('');
            updatePreview();
        }
    }

    // Function to handle adding multiple files
    document.getElementById('upload-file-button').addEventListener('click', function() {
        const fileInput = document.getElementById('file-upload');
        const filesArray = fileInput.files;
        Array.from(filesArray).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const fileName = file.name;
                const fileType = fileName.endsWith('.css') ? 'css' :
                                 fileName.endsWith('.js') ? 'javascript' :
                                 fileName.endsWith('.html') ? 'htmlmixed' :
                                 (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.gif') || fileName.endsWith('.png')) ? 'image' : 'text/plain';
                const fileContent = event.target.result;
                addFile(fileName, fileType, fileContent);
            };
            if (file.type.startsWith('image/')) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        });
    });

    // Function to handle exporting the project
    document.getElementById('export-project-button').addEventListener('click', () => {
        const zip = new JSZip();
        for (const [fileName, fileData] of Object.entries(files)) {
            if (fileData.type === 'image') {
                const base64Data = fileData.content.split(',')[1];
                zip.file(fileName, base64Data, { base64: true });
            } else {
                zip.file(fileName, fileData.content);
            }
        }
        zip.generateAsync({ type: "blob" })
            .then(content => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = "project.zip";
                link.click();
            });
    });

    // Function to handle importing a project
    document.getElementById('import-project').addEventListener('change', function(event) {
        const filesArray = event.target.files;
        Array.from(filesArray).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const fileName = file.webkitRelativePath;
                const fileType = fileName.endsWith('.css') ? 'css' :
                                 fileName.endsWith('.js') ? 'javascript' :
                                 fileName.endsWith('.html') ? 'htmlmixed' :
                                 (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.gif') || fileName.endsWith('.png')) ? 'image' : 'text/plain';
                const fileContent = event.target.result;
                addFile(fileName, fileType, fileContent);
            };
            if (file.type.startsWith('image/')) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        });
    });

    document.getElementById('add-file-button').addEventListener('click', () => {
        const fileName = prompt('Enter the name of the new file:');
        if (fileName) addFile(fileName, 'text/plain', '');
    });

    document.getElementById('theme-selector').addEventListener('change', (event) => {
        changeTheme(event.target.value);
    });

    codeEditor.on('change', updatePreview);

    addFile('index.html', 'text/html', `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
</body>
</html>`);

    updatePreview();
});


/*
 _______  __  ___   ___ ____    ____ 
|   ____||  | \  \ /  / \   \  /   / 
|  |__   |  |  \  V  /   \   \/   /  
|   __|  |  |   >   <     \_    _/   
|  |     |  |  /  .  \      |  |     
|__|     |__| /__/ \__\     |__|     
                                     
*/