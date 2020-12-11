import React, { useRef, useContext, useState, useEffect } from "react";
import { Flex, Label, Button } from "theme-ui";
import shortid from "shortid";
import Case from "case";

import EditTokenModal from "./EditTokenModal";
import EditGroupModal from "./EditGroupModal";
import ConfirmModal from "./ConfirmModal";

import Modal from "../components/Modal";
import ImageDrop from "../components/ImageDrop";
import TokenTiles from "../components/token/TokenTiles";
import LoadingOverlay from "../components/LoadingOverlay";

import blobToBuffer from "../helpers/blobToBuffer";
import useKeyboard from "../helpers/useKeyboard";
import { useSearch, useGroup, handleItemSelect } from "../helpers/select";

import TokenDataContext from "../contexts/TokenDataContext";
import AuthContext from "../contexts/AuthContext";

function SelectTokensModal({ isOpen, onRequestClose }) {
  const { userId } = useContext(AuthContext);
  const {
    ownedTokens,
    addToken,
    removeTokens,
    updateTokens,
    tokensLoading,
  } = useContext(TokenDataContext);

  /**
   * Search
   */
  const [search, setSearch] = useState("");
  const [filteredTokens, filteredTokenScores] = useSearch(ownedTokens, search);

  function handleSearchChange(event) {
    setSearch(event.target.value);
  }

  /**
   * Group
   */
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  async function handleTokensGroup(group) {
    setIsGroupModalOpen(false);
    await updateTokens(selectedTokenIds, { group });
  }

  const [tokensByGroup, tokenGroups] = useGroup(
    ownedTokens,
    filteredTokens,
    !!search,
    filteredTokenScores
  );

  /**
   * Image Upload
   */

  const fileInputRef = useRef();
  const [imageLoading, setImageLoading] = useState(false);

  function openImageDialog() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function handleImagesUpload(files) {
    if (navigator.storage) {
      // Attempt to enable persistant storage
      await navigator.storage.persist();
    }

    for (let file of files) {
      await handleImageUpload(file);
    }
    // Set file input to null to allow adding the same image 2 times in a row
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  }

  async function handleImageUpload(file) {
    let name = "Unknown Token";
    if (file.name) {
      // Remove file extension
      name = file.name.replace(/\.[^/.]+$/, "");
      // Removed grid size expression
      name = name.replace(/(\[ ?|\( ?)?\d+ ?(x|X) ?\d+( ?\]| ?\))?/, "");
      // Clean string
      name = name.replace(/ +/g, " ");
      name = name.trim();
      // Capitalize and remove underscores
      name = Case.capital(name);
    }
    let image = new Image();
    setImageLoading(true);
    const buffer = await blobToBuffer(file);

    // Copy file to avoid permissions issues
    const blob = new Blob([buffer]);
    // Create and load the image temporarily to get its dimensions
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      image.onload = function () {
        handleTokenAdd({
          file: buffer,
          name,
          id: shortid.generate(),
          type: "file",
          created: Date.now(),
          lastModified: Date.now(),
          lastUsed: Date.now(),
          owner: userId,
          defaultSize: 1,
          category: "character",
          hideInSidebar: false,
          group: "",
          width: image.width,
          height: image.height,
        });
        setImageLoading(false);
        resolve();
      };
      image.onerror = reject;
      image.src = url;
    });
  }

  /**
   * Token controls
   */
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTokenIds, setSelectedTokenIds] = useState([]);
  const selectedTokens = ownedTokens.filter((token) =>
    selectedTokenIds.includes(token.id)
  );

  function handleTokenAdd(token) {
    addToken(token);
    setSelectedTokenIds([token.id]);
  }

  const [isTokensRemoveModalOpen, setIsTokensRemoveModalOpen] = useState(false);
  async function handleTokensRemove() {
    setIsTokensRemoveModalOpen(false);
    await removeTokens(selectedTokenIds);
    setSelectedTokenIds([]);
  }

  async function handleTokensHide(hideInSidebar) {
    await updateTokens(selectedTokenIds, { hideInSidebar });
  }

  // Either single, multiple or range
  const [selectMode, setSelectMode] = useState("single");

  async function handleTokenSelect(token) {
    handleItemSelect(
      token,
      selectMode,
      selectedTokenIds,
      setSelectedTokenIds,
      tokensByGroup,
      tokenGroups
    );
  }

  /**
   * Shortcuts
   */
  function handleKeyDown({ key }) {
    if (!isOpen) {
      return;
    }
    if (key === "Shift") {
      setSelectMode("range");
    }
    if (key === "Control" || key === "Meta") {
      setSelectMode("multiple");
    }
    if (key === "Backspace" || key === "Delete") {
      // Selected tokens and none are default
      if (
        selectedTokenIds.length > 0 &&
        !selectedTokens.some((token) => token.type === "default")
      ) {
        setIsTokensRemoveModalOpen(true);
      }
    }
  }

  function handleKeyUp({ key }) {
    if (!isOpen) {
      return;
    }
    if (key === "Shift" && selectMode === "range") {
      setSelectMode("single");
    }
    if ((key === "Control" || key === "Meta") && selectMode === "multiple") {
      setSelectMode("single");
    }
  }

  useKeyboard(handleKeyDown, handleKeyUp);

  // Set select mode to single when alt+tabing
  useEffect(() => {
    function handleBlur() {
      setSelectMode("single");
    }

    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={{ maxWidth: "542px", width: "calc(100% - 16px)" }}
    >
      <ImageDrop onDrop={handleImagesUpload} dropText="Drop token to upload">
        <input
          onChange={(event) => handleImagesUpload(event.target.files)}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          ref={fileInputRef}
          multiple
        />
        <Flex
          sx={{
            flexDirection: "column",
          }}
        >
          <Label pt={2} pb={1}>
            Edit or import a token
          </Label>
          <TokenTiles
            tokens={tokensByGroup}
            groups={tokenGroups}
            onTokenAdd={openImageDialog}
            onTokenEdit={() => setIsEditModalOpen(true)}
            onTokensRemove={() => setIsTokensRemoveModalOpen(true)}
            selectedTokens={selectedTokens}
            onTokenSelect={handleTokenSelect}
            selectMode={selectMode}
            onSelectModeChange={setSelectMode}
            search={search}
            onSearchChange={handleSearchChange}
            onTokensGroup={() => setIsGroupModalOpen(true)}
            onTokensHide={handleTokensHide}
          />
          <Button
            variant="primary"
            disabled={imageLoading}
            onClick={onRequestClose}
          >
            Done
          </Button>
        </Flex>
      </ImageDrop>
      {tokensLoading && <LoadingOverlay bg="overlay" />}
      <EditTokenModal
        isOpen={isEditModalOpen}
        onDone={() => setIsEditModalOpen(false)}
        token={selectedTokens.length === 1 && selectedTokens[0]}
      />
      <EditGroupModal
        isOpen={isGroupModalOpen}
        onChange={handleTokensGroup}
        groups={tokenGroups.filter(
          (group) => group !== "" && group !== "default"
        )}
        onRequestClose={() => setIsGroupModalOpen(false)}
        // Select the default group by testing whether all selected tokens are the same
        defaultGroup={
          selectedTokens.length > 0 &&
          selectedTokens
            .map((map) => map.group)
            .reduce((prev, curr) => (prev === curr ? curr : undefined))
        }
      />
      <ConfirmModal
        isOpen={isTokensRemoveModalOpen}
        onRequestClose={() => setIsTokensRemoveModalOpen(false)}
        onConfirm={handleTokensRemove}
        confirmText="Remove"
        label={`Remove ${selectedTokenIds.length} Token${
          selectedTokenIds.length > 1 ? "s" : ""
        }`}
        description="This operation cannot be undone."
      />
    </Modal>
  );
}

export default SelectTokensModal;
