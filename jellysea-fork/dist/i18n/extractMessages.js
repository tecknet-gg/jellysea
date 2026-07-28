"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
async function getFiles(dir) {
    const dirents = await fs_1.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = (0, path_1.join)(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}
async function extractMessages(filePath) {
    const content = await fs_1.promises.readFile(filePath, 'utf8');
    const regex = /defineMessages\(\n?\s*'(.+?)',\n?\s*\{([\s\S]+?)\}\n?\);/;
    const match = content.match(regex);
    if (match) {
        const [, namespace, messages] = match;
        try {
            const formattedMessages = messages
                .trim()
                .replace(/^\s*(['"])?([a-zA-Z0-9_-]+)(['"])?:[\s\n]*/gm, '"$2":')
                .replace(/^"[a-zA-Z0-9_-]+":'.*',?$/gm, (match) => {
                const parts = /^("[a-zA-Z0-9_-]+":)'(.*)',?$/.exec(match);
                if (!parts)
                    return match;
                return `${parts[1]}"${parts[2]
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')}",`;
            })
                .replace(/,$/, '');
            const messagesJson = JSON.parse(`{${formattedMessages}}`);
            return { namespace: namespace.trim(), messages: messagesJson };
        }
        catch {
            return null;
        }
    }
    return null;
}
async function processMessages(dir) {
    const files = await getFiles(dir);
    const tsFiles = files.filter((f) => /\.tsx?$/.test(f));
    const extractedMessagesGroups = await Promise.all(tsFiles.map(extractMessages));
    const messagesByNamespace = [];
    const namespaces = [
        ...new Set(extractedMessagesGroups.map((msg) => msg?.namespace)),
    ];
    for (const namespace of namespaces) {
        if (!namespace)
            continue;
        const filteredMessagesGroups = extractedMessagesGroups
            .filter((msg) => msg?.namespace === namespace)
            .map((msg) => msg?.messages);
        for (const extractedMessages of filteredMessagesGroups) {
            if (!extractedMessages)
                continue;
            const previousNamespaceMessages = messagesByNamespace.find((msg) => msg.namespace === namespace);
            if (previousNamespaceMessages) {
                Object.assign(previousNamespaceMessages.messages, extractedMessages);
            }
            else {
                messagesByNamespace.push({ namespace, messages: extractedMessages });
            }
        }
    }
    messagesByNamespace.sort((a, b) => {
        if (!a || !b)
            return 0;
        if (a.namespace.startsWith(b.namespace) ||
            b.namespace.startsWith(a.namespace)) {
            const aLevel = a.namespace.match(/\./g)?.length || 0;
            const bLevel = b.namespace.match(/\./g)?.length || 0;
            return bLevel - aLevel;
        }
        return a.namespace.localeCompare(b.namespace);
    });
    const result = {};
    for (const extractedMessages of messagesByNamespace) {
        const { namespace, messages } = extractedMessages;
        for (const key of Object.keys(messages).sort()) {
            result[`${namespace}.${key}`] = messages[key];
        }
    }
    return JSON.stringify(result, Object.keys(result).sort(), '  ') + '\n';
}
async function saveMessages() {
    const targets = [
        { dir: './src/', output: './src/i18n/locale/en.json' },
        { dir: './server/', output: './server/i18n/locale/en.json' },
    ];
    for (const { dir, output } of targets) {
        const result = await processMessages(dir);
        await fs_1.promises.writeFile(output, result);
    }
}
saveMessages();
