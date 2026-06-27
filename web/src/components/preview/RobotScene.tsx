import { memo } from 'react';
import type { RoboticsViewportData } from '../../lib/types/roboticsRender';
import type { PreviewDisplayOptions, PreviewViewMode } from '../../lib/types/worldRender';
import { FailureMarker } from './FailureMarker';
import { RobotModel } from './RobotModel';
import { SceneObjectMesh } from './SceneObjectMesh';
import { SuccessMarker } from './SuccessMarker';
import { TargetZone } from './TargetZone';
import { TrajectoryPath } from './TrajectoryPath';
import { WaypointMarkers } from './WaypointMarkers';

interface RobotSceneProps {
  data: RoboticsViewportData;
  viewMode: PreviewViewMode;
  display: PreviewDisplayOptions;
}

export const RobotScene = memo(function RobotScene({ data, viewMode, display }: RobotSceneProps) {
  const worldObjects = data.objects.filter((obj) => obj.type !== 'table');
  const showCompare = viewMode === 'retest_compare' && data.compareTrajectory && data.compareTrajectory.length > 1;
  const activeTrajectoryIndex = Math.min(
    data.trajectory.length - 1,
    Math.max(0, data.currentFrame),
  );
  const editMode = viewMode === 'robot_edit';

  const showFailure =
    display.showFailureMarkers &&
    (viewMode === 'failure_analysis' || viewMode === 'replay' || viewMode === 'live' || viewMode === 'task_preview');
  const showSuccess =
    display.showSuccessMarkers &&
    (viewMode === 'retest_compare' || viewMode === 'replay' || data.currentLoopStep === 'improve');
  const showTargets = display.showTargetZones && viewMode !== 'failure_analysis';

  return (
    <group>
      {data.objects
        .filter((obj) => obj.type === 'table')
        .map((object) => (
          <SceneObjectMesh key={object.id} object={object} showLabel={false} />
        ))}

      {showTargets
        ? data.targetZones.map((zone) => (
            <TargetZone key={zone.id} showLabel={display.showLabels} zone={zone} />
          ))
        : null}

      {worldObjects.map((object) => (
        <SceneObjectMesh key={object.id} object={object} showLabel={display.showLabels} />
      ))}

      <RobotModel config={data.robotConfig} editMode={editMode} showLabel={display.showLabels} />

      <TrajectoryPath
        activeIndex={activeTrajectoryIndex}
        color="#4ba3ff"
        opacity={0.95}
        points={data.trajectory}
        visible={display.showTrajectory}
      />
      <WaypointMarkers
        activeIndex={activeTrajectoryIndex}
        points={data.trajectory}
        visible={display.showTrajectory && display.showWaypoints}
      />

      {showCompare ? (
        <TrajectoryPath
          color="#c94a5a"
          dashed
          opacity={0.7}
          points={data.compareTrajectory!}
          visible={display.showTrajectory}
        />
      ) : null}

      {data.markers.map((marker) =>
        marker.type === 'failure' || marker.type === 'warning' ? (
          <FailureMarker
            key={`${marker.type}-${marker.label}`}
            label={marker.label}
            position={marker.position}
            pulse={marker.pulse}
            visible={showFailure}
          />
        ) : (
          <SuccessMarker
            key={`${marker.type}-${marker.label}`}
            label={marker.label}
            position={marker.position}
            pulse={marker.pulse}
            visible={showSuccess}
          />
        ),
      )}
    </group>
  );
});
