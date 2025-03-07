import { expose, List, TemplateUiCommand, ui } from "@kksh/api/ui/template";
import { getAutoSearchResults, getStaticResult } from "./utils/handleResults";
import { SearchResult } from "./utils/types";

class DemoExtension extends TemplateUiCommand {
  private isLoading: boolean = false;
  private results: SearchResult[] = [];
  private searchText: string = "ola";
  private staticResults: SearchResult[] = [];
  private autoResults: SearchResult[] = [];
  private cancelRef: AbortController | null = null;

  async load() {
    // load method is run when the extension is loaded, you can use it as an initializer
    console.log("Extension loaded");
    this.updateUI();
  }

  async onSearchTermChange(searchText: string) {
    console.log("Search term changed:", searchText);
    this.searchText = searchText;
    this.staticResults = getStaticResult(searchText);
    await this.fetchAutoResults(searchText);
    this.combineResults();
    this.updateUI();
  }

  async fetchAutoResults(searchText: string) {
    this.cancelRef?.abort();
    this.cancelRef = new AbortController();

    try {
      this.isLoading = true;
      this.updateUI();
      console.log("Fetching auto results for:", searchText);

      if (searchText) {
        const autoSearchResult = await getAutoSearchResults(
          searchText,
          this.cancelRef.signal
        );
        this.autoResults = autoSearchResult;
        console.log("Auto results fetched:", this.autoResults);
      } else {
        this.autoResults = [];
        console.log("No search text, auto results cleared");
      }

      this.isLoading = false;
      this.updateUI();
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }

      console.error("Search error", error);
      ui.showToast({
        style: "error",
        title: "Could not perform search",
        message: String(error),
      });
    }
  }

  combineResults() {
    console.log("Combining results");
    this.results = [...this.staticResults, ...this.autoResults].filter(
      (value, index, self) => index === self.findIndex((t) => t.id === value.id)
    );
    console.log("Combined results:", this.results);
  }

  updateUI() {
    console.log("Updating UI with results:", this.results);
    return ui
      .setSearchBarPlaceholder("Enter a search term, and press enter to search")
      .then(() => {
        return ui.render(
          new List.List({
            sections: [
              new List.Section({
                items: this.results.map(
                  (result) =>
                    new List.Item({
                      title: result.query,
                      value: result.id,
                    })
                ),
              }),
            ],
          })
        );
      });
  }
}

expose(new DemoExtension());
