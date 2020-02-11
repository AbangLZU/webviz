// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import { Tabs } from "antd";
import { get, omit, isEmpty } from "lodash";
import React from "react";
import styled from "styled-components";

import type { TopicItem, TopicGroupType, OnTopicGroupsChange, SceneCollectors } from "./types";
import Button from "webviz-core/src/components/Button";
import ErrorBoundary from "webviz-core/src/components/ErrorBoundary";
import { topicSettingsEditorForDatatype } from "webviz-core/src/panels/ThreeDimensionalViz/TopicSettingsEditor";
import { colors } from "webviz-core/src/util/colors";

const STopicSettingsEditor = styled.div`
  background: ${colors.TOOLBAR};
  color: ${colors.TEXT};
  padding: 16px;
`;
const STitle = styled.h3`
  font-size: 20px;
  word-wrap: break-word;
`;

const SDatatype = styled.p`
  padding-bottom: 12px;
`;

const STabWrapper = styled.div`
  color: ${colors.TEXT};
`;

// TODO(Audrey): use tinyColor instead
// Parse color saved into topic settings into {r, g, b, a} form.
export function parseColorSetting(rgba: ?string, divisor?: number = 255) {
  const [r = 255, g = 255, b = 255, a = 1] = (rgba || "")
    .split(",")
    .map(parseFloat)
    .map((x) => (isNaN(x) ? undefined : x));
  return { r: r / divisor, g: g / divisor, b: b / divisor, a };
}

type Props = {|
  objectPath: string,
  onTopicGroupsChange: OnTopicGroupsChange,
  sceneCollectors: SceneCollectors,
|};

function MainEditor({
  sceneCollectors,
  prefix,
  objectPath,
  onTopicGroupsChange,
  topicItem,
  topicItem: {
    topicName,
    settingsBySource,
    derivedFields: { displayName, availablePrefixes, datatype },
  },
}: {|
  ...Props,
  topicItem: TopicItem,
  prefix: string,
|}) {
  if (!datatype) {
    return null;
  }

  const prefixedTopicName = `${prefix}${topicName}`;
  const settings = (settingsBySource && settingsBySource[prefix]) || {};
  const Editor = topicSettingsEditorForDatatype(datatype);
  if (!Editor) {
    throw new Error(`No topic settings editor available for ${datatype}`);
  }

  return (
    <ErrorBoundary>
      <>
        <Editor
          message={sceneCollectors[prefixedTopicName] ? sceneCollectors[prefixedTopicName].getMessages()[0] : undefined}
          onFieldChange={(fieldName, value) => {
            const newSettingsBySource = {
              ...settingsBySource,
              [prefix]: {
                ...settings,
                [fieldName]: value,
              },
            };
            onTopicGroupsChange(`${objectPath}.settingsBySource`, newSettingsBySource);
          }}
          settings={settings}
          onSettingsChange={(newSettings) => {
            const newSettingsBySource = {
              ...settingsBySource,
              [prefix]:
                typeof newSettings === "function"
                  ? newSettings((settingsBySource && settingsBySource[prefix]) || {})
                  : newSettings,
            };
            onTopicGroupsChange(`${objectPath}.settingsBySource`, newSettingsBySource);
          }}
        />
        <Button
          className="test-reset-settings-btn"
          style={{ marginTop: 8 }}
          onClick={() => {
            const newSettingsBySource = omit(settingsBySource, prefix);
            // No need to save empty settings
            if (isEmpty(newSettingsBySource)) {
              onTopicGroupsChange(objectPath, omit(topicItem, "settingsBySource"));
            } else {
              onTopicGroupsChange(`${objectPath}.settingsBySource`, newSettingsBySource);
            }
          }}>
          Reset to defaults
        </Button>
      </>
    </ErrorBoundary>
  );
}
export default function TopicSettingsEditor({
  objectPath,
  onTopicGroupsChange,
  sceneCollectors,
  topicGroups,
  dataTestDefaultTabKey,
}: {|
  ...Props,
  topicGroups: TopicGroupType[],
  dataTestDefaultTabKey?: string,
|}) {
  const topicItem = get(topicGroups, objectPath);
  if (!topicItem) {
    throw new Error(`This should never happen. objectPath for topic item (${objectPath}) is invalid.`);
  }
  const {
    topicName,
    derivedFields: { availablePrefixes, datatype },
  } = topicItem;

  if (availablePrefixes.length === 0 || !datatype) {
    return null;
  }

  const renderSingleSetting = availablePrefixes.length === 1;

  return (
    <STopicSettingsEditor>
      <STitle> {topicName}</STitle>
      <SDatatype>{datatype}</SDatatype>
      {renderSingleSetting && (
        <MainEditor
          objectPath={objectPath}
          onTopicGroupsChange={onTopicGroupsChange}
          prefix={availablePrefixes[0]}
          sceneCollectors={sceneCollectors}
          topicItem={topicItem}
        />
      )}
      {!renderSingleSetting && (
        <div className="ant-component">
          <Tabs defaultActiveKey={dataTestDefaultTabKey || "0"}>
            {availablePrefixes.map((prefix, idx) => (
              <Tabs.TabPane tab={prefix || "base"} key={idx}>
                <STabWrapper>
                  <MainEditor
                    objectPath={objectPath}
                    onTopicGroupsChange={onTopicGroupsChange}
                    prefix={prefix}
                    sceneCollectors={sceneCollectors}
                    topicItem={topicItem}
                  />
                </STabWrapper>
              </Tabs.TabPane>
            ))}
          </Tabs>
        </div>
      )}
    </STopicSettingsEditor>
  );
}