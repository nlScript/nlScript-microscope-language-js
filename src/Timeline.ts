export class Timeline<E> {
    
    private timeline: Array<[Date, E[]]> = [];
    private stop: boolean = false;
    private executor: Promise<void> | null = null;
  
    public put(time: Date, entry: E): void {
        this.timeline.push([time, [entry]]);
        this.timeline.sort((a, b) => a[0].getTime() - b[0].getTime());
    }
  
    public runAndRemoveEntriesBefore(time: Date, func: (entry: E) => void): void {
        const timesToRemove: Date[] = [];
        for (let i = 0; i < this.timeline.length; i++) {
            const [entryTime, entries] = this.timeline[i];
            if (entryTime < time) {
                timesToRemove.push(entryTime);
                for (const entry of entries) {
                    func(entry);
                }
            } else {
                break;
            }
        }
  
        for (const timeToRemove of timesToRemove) {
            const index = this.timeline.findIndex(([key]) => key === timeToRemove);
            if (index !== -1) {
                this.timeline.splice(index, 1);
            }
        }
    }
  
    public async process(func: (entry: E) => void): Promise<void> {
        this.stop = false;
        this.executor = new Promise<void>(async (resolve) => {
            while (!this.stop && this.timeline.length > 0) {
                this.runAndRemoveEntriesBefore(new Date(), func);
                if (this.timeline.length === 0) {
                    resolve();
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            resolve();
        });
  
        await this.executor;
    }
  
    public async waitForProcessing(): Promise<void> {
        if (this.executor) {
            await this.executor;
        }
    }
  
    public cancel(): void {
        this.stop = true;
    }
  
    public clear(): void {
        this.timeline = [];
    }
  
    public toString(): string {
        let sb = '';
        for (const [t, entries] of this.timeline) {
            sb += t + ' -> ' + entries;
        }
        return sb;
    }
}
  