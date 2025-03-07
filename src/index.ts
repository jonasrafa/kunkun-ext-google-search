import {
  Action,
  clipboard,
  expose,
  Icon,
  IconEnum,
  List,
  open,
  TemplateUiCommand,
  toast,
  ui,
} from "@kksh/api/ui/template";
import { getAutoSearchResults, getStaticResult } from "./utils/handleResults";
import type { SearchResult } from "./utils/types";

const Actions = {
  OpenInBrowser: "Open in Browser",
  CopyUrl: "Copy URL",
  CopyQuery: "Copy Query",
};

class DemoExtension extends TemplateUiCommand {
  private isLoading: boolean = false;
  private results: SearchResult[] = [];
  private searchText: string = "ola";
  private staticResults: SearchResult[] = [];
  private autoResults: SearchResult[] = [];
  private cancelRef: AbortController | null = null;

  async load() {
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

      if (searchText) {
        const autoSearchResult = await getAutoSearchResults(
          searchText,
          this.cancelRef.signal
        );
        this.autoResults = autoSearchResult;
      } else {
        this.autoResults = [];
        console.log("No search text, auto results cleared");
      }

      this.isLoading = false;
      this.updateUI();
    } catch (error) {
      console.error("Could not perform search", error);
    }
  }

  combineResults() {
    this.results = [...this.staticResults, ...this.autoResults].filter(
      (value, index, self) => index === self.findIndex((t) => t.id === value.id)
    );
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
                title: "Results",
                items: this.results.map(
                  (result) =>
                    new List.Item({
                      title: result.query,
                      value: result.url,
                      defaultAction: Actions.OpenInBrowser,
                      actions: new Action.ActionPanel({
                        items: [
                          new Action.Action({
                            title: Actions.OpenInBrowser,
                            value: Actions.OpenInBrowser,
                            icon: new Icon({
                              type: IconEnum.Iconify,
                              value: "material-symbols:open-in-new",
                            }),
                          }),
                          new Action.Action({
                            title: Actions.CopyUrl,
                            value: Actions.CopyUrl,
                            icon: new Icon({
                              type: IconEnum.Iconify,
                              value: "material-symbols:copy-all-outline",
                            }),
                          }),
                          new Action.Action({
                            title: Actions.CopyQuery,
                            value: Actions.CopyQuery,
                            icon: new Icon({
                              type: IconEnum.Iconify,
                              value: "material-symbols:copy-all-outline",
                            }),
                          }),
                        ],
                      }),
                      icon: new Icon({
                        type: IconEnum.Iconify,
                        value: result.isNavigation
                          ? "material-symbols:open-in-new"
                          : "material-symbols:search",
                      }),
                    })
                ),
              }),
            ],
          })
        );
      });
  }

  onListItemSelected(value: string): Promise<void> {
    return open.url(value);
  }

  onActionSelected(value: string): Promise<void> {
    if (this.highlightedListItemValue) {
      if (value === Actions.OpenInBrowser) {
        console.log(this.highlightedListItemValue);
        return open.url(this.highlightedListItemValue);
      }

      if (value === Actions.CopyUrl) {
        return clipboard
          .writeText(this.highlightedListItemValue)
          .then(() => {
            return toast.success("Copied URL to clipboard");
          })
          .catch((err) => {
            console.error(err);
            return toast.error("Failed to copy URL to clipboard");
          });
      }

      if (value === Actions.CopyQuery) {
        const query = this.results.find(
          (result) => result.url === this.highlightedListItemValue
        )?.query;
        if (query) {
          return clipboard
            .writeText(query)
            .then(() => {
              return toast.success("Copied query to clipboard");
            })
            .catch((err) => {
              console.error(err);
              return toast.error("Failed to copy query to clipboard");
            });
        }
      }

      return Promise.resolve();
    }
    return toast.warning("No item selected").then(() => {});
  }
}

expose(new DemoExtension());
