import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Box, Flex, Grid } from "theme-ui";
import SimpleBar from "simplebar-react";
import {
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import TokenBarToken from "./TokenBarToken";
import TokenBarTokenGroup from "./TokenBarTokenGroup";
import SelectTokensButton from "./SelectTokensButton";

import Draggable from "../drag/Draggable";

import useSetting from "../../hooks/useSetting";
import usePreventSelect from "../../hooks/usePreventSelect";

import { useTokenData } from "../../contexts/TokenDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { useMapStage } from "../../contexts/MapStageContext";
import DragContext from "../../contexts/DragContext";

import {
  createTokenState,
  clientPositionToMapPosition,
} from "../../helpers/token";
import { findGroup } from "../../helpers/group";
import Vector2 from "../../helpers/Vector2";

function TokenBar({ onMapTokensStateCreate }) {
  const { userId } = useAuth();
  const { tokensById, tokenGroups } = useTokenData();
  const [fullScreen] = useSetting("map.fullScreen");

  const [dragId, setDragId] = useState();

  const mapStageRef = useMapStage();

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { distance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  const [preventSelect, resumeSelect] = usePreventSelect();

  function handleDragStart({ active }) {
    setDragId(active.id);
    preventSelect();
  }

  function handleDragEnd({ active, overlayNodeClientRect }) {
    setDragId(null);

    const mapStage = mapStageRef.current;
    if (mapStage) {
      const dragRect = overlayNodeClientRect;
      const dragPosition = {
        x: dragRect.left + dragRect.width / 2,
        y: dragRect.top + dragRect.height / 2,
      };
      const mapPosition = clientPositionToMapPosition(mapStage, dragPosition);
      const group = findGroup(tokenGroups, active.id);
      if (group && mapPosition) {
        if (group.type === "item") {
          const token = tokensById[group.id];
          const tokenState = createTokenState(token, mapPosition, userId);
          onMapTokensStateCreate([tokenState]);
        } else {
          let tokenStates = [];
          let offset = new Vector2(0, 0);
          for (let item of group.items) {
            const token = tokensById[item.id];
            if (token && !token.hideInSidebar) {
              tokenStates.push(
                createTokenState(
                  token,
                  Vector2.add(mapPosition, offset),
                  userId
                )
              );
              offset = Vector2.add(offset, 0.01);
            }
          }
          if (tokenStates.length > 0) {
            onMapTokensStateCreate(tokenStates);
          }
        }
      }
    }

    resumeSelect();
  }

  function handleDragCancel() {
    setDragId(null);
    resumeSelect();
  }

  function renderToken(group, draggable = true) {
    if (group.type === "item") {
      const token = tokensById[group.id];
      if (token && !token.hideInSidebar) {
        if (draggable) {
          return (
            <Draggable id={token.id} key={token.id}>
              <TokenBarToken token={token} />
            </Draggable>
          );
        } else {
          return <TokenBarToken token={token} key={token.id} />;
        }
      }
    } else {
      const groupTokens = [];
      for (let item of group.items) {
        const token = tokensById[item.id];
        if (token && !token.hideInSidebar) {
          groupTokens.push(token);
        }
      }
      if (groupTokens.length > 0) {
        return (
          <TokenBarTokenGroup
            group={group}
            tokens={groupTokens}
            key={group.id}
            draggable={draggable}
          />
        );
      }
    }
  }

  return (
    <DragContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      autoScroll={false}
      sensors={sensors}
    >
      <Box
        sx={{
          height: "100%",
          width: "80px",
          minWidth: "80px",
          overflowY: "hidden",
          overflowX: "hidden",
          display: fullScreen ? "none" : "block",
        }}
      >
        <SimpleBar
          style={{
            height: "calc(100% - 48px)",
            overflowX: "hidden",
            padding: "0 16px",
          }}
        >
          <Grid
            columns="1fr"
            gap={2}
            py={2}
            // Prevent selection on 3D touch for iOS
            onTouchStart={preventSelect}
            onTouchEnd={resumeSelect}
          >
            {tokenGroups.map((group) => renderToken(group))}
          </Grid>
        </SimpleBar>
        <Flex
          bg="muted"
          sx={{
            justifyContent: "center",
            height: "48px",
            alignItems: "center",
          }}
        >
          <SelectTokensButton onMapTokensStateCreate={onMapTokensStateCreate} />
        </Flex>
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {dragId && renderToken(findGroup(tokenGroups, dragId), false)}
          </DragOverlay>,
          document.body
        )}
      </Box>
    </DragContext>
  );
}

export default TokenBar;
