import { Plugin, Notice } from 'obsidian';

// Remember to rename these classes and interfaces!

export default class LyonsquarkWorkflowPlugin extends Plugin {

	async onload() {
		this.addCommand({
			id: "make-perm-notes-from-lit",
			name: "Make Permanent Notes from Literature",
			callback: () => {
				this.makePermNotesFromLit();
			}
		});
	}

	// Make permanent notes from a literature note
	async makePermNotesFromLit() {

		const permFolder = "Notes/Permanent";  // Maybe make this a setting

		// Does the permFolder exist?
		if (!await this.app.vault.adapter.exists(permFolder)) {
			new Notice(`Could not find folder ${permFolder}`, 5000);
			return;
		}

		// Get the active file (the literature note)
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active note", 5000);
			return;
		}

		// Are we in the literature directory?
		if (activeFile.parent.path != "Notes/Literature") {
			new Notice("Note not in Notes/Literature", 5000);
			return;
		}

		// Get the headings in the literature notes
		const currentFileCache = this.app.metadataCache.getFileCache(activeFile);
		const headingsInFile = currentFileCache.headings;
		if (!headingsInFile) {
			new Notice(`No headings in file ${activeFile.name}`, 5000);
			return;
		}

		// Get the text of the whole note
		const fileText = await this.app.vault.cachedRead(activeFile);

		// Figure out the tags
		let tag = "";
		const tagsRe = /\- tags: #note\/literature (.+)\n/;
		const tagsMatch = fileText.match(tagsRe);

		// Did we find any tags?
		if (tagsMatch === null || tagsMatch[1].trim() == "") {
			new Notice(`Not tags in file ${activeFile.name}`, 5000);
			return;
		}
		else {
			tag = tagsMatch[1].trim();
		}

		headingsInFile.forEach(async (heading, index) => {

			// Only examine level 3 headings
			if (heading.level === 3) {

				// Find the [[Term]]
				let titleRe = /\[\[(.+)\]\]/;
				const match = heading.heading.match(titleRe);
				if (match === null) {
					new Notice(`No link in ${heading.heading}`)
				}
				else {
					// Determine the name, path and text to put in the permanent note
					const title = match[1].trim();
					const path = `${permFolder}/${title}.md`;
					const text = heading.heading.replace(/[@\[\]]/g, "");
					const linkBack = `![[${activeFile.basename}#${text}]]`;

					// Does this note already exist?
					if (text && !(await this.app.vault.adapter.exists(path))) {
						// New note
						// We want to copy in the text of the block from the lit note
						let blockText = "";
						let startPos = heading.position.end.offset + 1;
						let endPos = 0;
						let lookAHead = index + 1;

						while (lookAHead < headingsInFile.length) {
							if (headingsInFile[lookAHead].level <= 3) {
								// We've found the end of the block
								endPos = headingsInFile[lookAHead].position.start.offset - 1;
								break;
							}
							else {
								lookAHead++;
							}
						}

						// Did we find the end?
						if (endPos > 0) {
							blockText = fileText.substring(startPos, endPos);
						}
						else {
							blockText = fileText.substring(startPos);
						}

						const toWrite = `# ${title}\n${tag}\n\n\n${blockText.trim()}\n\n\n## Scholarship\n${linkBack}\n`;
						await this.app.vault.create(path, toWrite);
						new Notice(`Created permanent note ${title}`)
					}

					else if (text) {
						// Note already exists
						const noteContents = await this.app.vault.adapter.read(path)

						// Make sure our link isn't already there
						if (!(noteContents.includes(linkBack))) {
							const toWrite = `${noteContents.trim()}\n\n#NEEDS_MERGING ${linkBack}\n`
							await this.app.vault.adapter.write(path, toWrite);
							new Notice(`Adding to permanent note ${title}. WILL NEED MERGING`)
						}
						else {
							new Notice(`Not duplicating in ${title}`)
						}
					}
				}

			}
		});
	}
}