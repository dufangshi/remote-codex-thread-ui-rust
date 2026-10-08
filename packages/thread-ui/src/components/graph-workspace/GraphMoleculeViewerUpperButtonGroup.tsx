import { translate, useI18n } from '../../i18n';
import type { GLViewer } from '3dmol';
import { Box, Camera, Copy, Download, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { RefObject } from 'react';

import { ButtonGroupSeparator } from '../graph-ui/ButtonGroup';
import {
  downloadTextFile,
  GraphMoleculeButtonGroup,
  GraphMoleculeIconButton,
  moleculeSlug,
} from './GraphMoleculeViewerControls';

export default function GraphMoleculeViewerUpperButtonGroup({
  currentIndex,
  exportContent,
  moleculeId,
  onScreenshot,
  viewerRef,
  xyzContent,
  xyzFormat,
}: {
  currentIndex: number;
  exportContent: string;
  moleculeId?: string | null;
  onScreenshot: () => void;
  viewerRef: RefObject<GLViewer | null>;
  xyzContent: string | null;
  xyzFormat: string;
}) {
  useI18n();
  const slug = moleculeSlug(moleculeId);

  async function handleCopyXYZ() {
    if (!xyzContent) {
      return;
    }
    await navigator.clipboard.writeText(xyzContent);
  }

  function handleDownloadXYZ() {
    if (!xyzContent) {
      return;
    }
    downloadTextFile(
      xyzContent,
      `${slug}_step_${currentIndex + 1}.${xyzFormat || 'xyz'}`,
    );
  }

  function handleDownloadAllXYZ() {
    if (!exportContent) {
      return;
    }
    downloadTextFile(exportContent, `${slug}_trajectory.${xyzFormat || 'xyz'}`);
  }

  function handleZoomIn() {
    if (!viewerRef.current) {
      return;
    }
    viewerRef.current.zoom(1.2);
    viewerRef.current.render();
  }

  function handleZoomOut() {
    if (!viewerRef.current) {
      return;
    }
    viewerRef.current.zoom(0.8);
    viewerRef.current.render();
  }

  function handleReset() {
    if (!viewerRef.current) {
      return;
    }
    viewerRef.current.zoomTo();
    viewerRef.current.setCameraParameters({});
    viewerRef.current.render();
  }

  return (
    <GraphMoleculeButtonGroup className="ml-auto justify-end">
      <GraphMoleculeIconButton
        label={translate("files.copyCurrentStructure")}
        onClick={() => void handleCopyXYZ()}
        disabled={!xyzContent}
      >
        <Copy className="size-3.5" />
      </GraphMoleculeIconButton>
      <GraphMoleculeIconButton
        label={translate("files.downloadCurrentStructure")}
        onClick={handleDownloadXYZ}
        disabled={!xyzContent}
      >
        <Download className="size-3.5" />
      </GraphMoleculeIconButton>
      <GraphMoleculeIconButton
        label={translate("files.downloadFullTrajectory")}
        onClick={handleDownloadAllXYZ}
        disabled={!exportContent}
      >
        <Box className="size-3.5" />
      </GraphMoleculeIconButton>
      <GraphMoleculeIconButton
        label={translate("files.copyScreenshot")}
        onClick={onScreenshot}
        disabled={!viewerRef.current || !xyzContent}
      >
        <Camera className="size-3.5" />
      </GraphMoleculeIconButton>
      <ButtonGroupSeparator className="thread-graph-molecule-button-divider" />
      <GraphMoleculeIconButton
        label={translate("files.zoomIn")}
        onClick={handleZoomIn}
        disabled={!viewerRef.current || !xyzContent}
      >
        <ZoomIn className="size-3.5" />
      </GraphMoleculeIconButton>
      <GraphMoleculeIconButton
        label={translate("files.zoomOut")}
        onClick={handleZoomOut}
        disabled={!viewerRef.current || !xyzContent}
      >
        <ZoomOut className="size-3.5" />
      </GraphMoleculeIconButton>
      <GraphMoleculeIconButton
        label={translate("files.resetCamera")}
        onClick={handleReset}
        disabled={!viewerRef.current || !xyzContent}
      >
        <RotateCcw className="size-3.5" />
      </GraphMoleculeIconButton>
    </GraphMoleculeButtonGroup>
  );
}
