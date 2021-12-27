import { App, Modal, Setting } from "obsidian";
import { text } from "stream/consumers";

export class AskForTagModal extends Modal {

    result: string;
    onSubmit: (result: string) => void;

    constructor(app: App, onSubmit: (result: string) => void) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h1", { text: "Tag for new files (include the #)" });

        new Setting(contentEl)
            .setName("tag")
            .addText((text) =>
                text.onChange((value) => { this.result = value }));

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Submit")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.result);
                    }));
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
