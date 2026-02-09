import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { DataSourceManager } from "../DataSourceManager";

jest.mock("../DataSourceToggle", () => ({
  DataSourceToggle: (props: { rightAccessory?: React.ReactNode }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return (
      <>
        <Text testID="data-source-toggle">toggle</Text>
        {props.rightAccessory}
      </>
    );
  },
}));

describe("DataSourceManager", () => {
  it("renders the DataSourceToggle", () => {
    const { getByTestId } = render(<DataSourceManager showDetails={false} />);
    expect(getByTestId("data-source-toggle")).toBeTruthy();
  });

  it("renders rightAccessory when provided", () => {
    const { getByText } = render(
      <DataSourceManager
        showDetails={false}
        rightAccessory={<Text>Clear DataStore</Text>}
      />
    );
    expect(getByText("Clear DataStore")).toBeTruthy();
  });
});
