import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, ContactShadows, Html, Line } from '@react-three/drei';
import { Suspense } from 'react';
import type { LoopStepId, TrainingRun, TrainingTask, TrainingWorld, WorldObject } from '../../lib/types/splatforge';

interface SplatForgePreviewProps {
  world: TrainingWorld;
  task: TrainingTask;
  run: TrainingRun;
  currentStep: LoopStepId;
  policyVersion: string;
}

export function SplatForgePreview({ world, task, run, currentStep, policyVersion }: SplatForgePreviewProps) {
  return (
    <section className="preview-stage" aria-label="Reconstructed robot training world">
      <div className="preview-hud preview-hud-top">
        <div>
          <span className="hud-kicker">Reconstructed world</span>
          <strong>{world.name}</strong>
        </div>
        <div className="hud-pill">{world.sourceType === 'placeholder' ? 'Splat placeholder' : world.sourceType}</div>
      </div>

      <div className="preview-hud preview-hud-bottom">
        <div>
          <span className="hud-kicker">Task</span>
          <strong>{task.instruction}</strong>
        </div>
        <div>
          <span className="hud-kicker">Policy</span>
          <strong>{policyVersion}</strong>
        </div>
        <div>
          <span className="hud-kicker">Phase</span>
          <strong>{currentStep}</strong>
        </div>
      </div>

      <Canvas shadows camera={{ position: [2.35, 1.7, 2.15], fov: 45 }}>
        <PerspectiveCamera makeDefault position={[2.35, 1.7, 2.15]} />
        <OrbitControls makeDefault minDistance={1.2} maxDistance={4.5} minPolarAngle={0.25} maxPolarAngle={Math.PI / 1.82} />

        <Suspense fallback={null}>
          <SceneContent world={world} run={run} currentStep={currentStep} />
          <Environment preset="city" />
          <ContactShadows
            opacity={0.34}
            scale={8}
            blur={2.2}
            far={1.8}
            resolution={256}
            color="#000000"
          />
        </Suspense>

        <Grid
          infiniteGrid
          fadeDistance={7}
          fadeStrength={4}
          cellSize={0.25}
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#2a2a2a"
          cellColor="#151515"
        />

        <color attach="background" args={['#050608']} />
        <fog attach="fog" args={['#050608', 3.2, 7]} />
        <ambientLight intensity={0.38} />
        <spotLight position={[1.7, 3.2, 1.8]} angle={0.52} penumbra={0.8} intensity={2.4} castShadow />
        <pointLight position={[-2, 1.4, -1]} intensity={0.45} color="#f5f5f5" />
      </Canvas>
    </section>
  );
}

function SceneContent({
  world,
  run,
  currentStep,
}: {
  world: TrainingWorld;
  run: TrainingRun;
  currentStep: LoopStepId;
}) {
  const target = world.objects.find((object) => object.state === 'target');
  const targetZone = world.objects.find((object) => object.type === 'zone');
  const showFailure = ['critique', 'curriculum', 'train'].includes(currentStep);
  const showSuccess = ['retest', 'improve'].includes(currentStep);

  return (
    <group>
      {world.objects.map((object) => (
        <ObjectActor key={object.id} object={object} />
      ))}

      <RobotActor />

      <Line points={run.trajectory} color="#f2f2f2" lineWidth={2.25} dashed={false} transparent opacity={0.9} />

      {target && showFailure ? <FailureMarker position={[target.position[0], target.position[1] + 0.38, target.position[2]]} /> : null}
      {targetZone && showSuccess ? (
        <SuccessMarker position={[targetZone.position[0], targetZone.position[1] + 0.24, targetZone.position[2]]} />
      ) : null}
    </group>
  );
}

function ObjectActor({ object }: { object: WorldObject }) {
  const rotation = object.rotation ?? [0, 0, 0];

  if (object.type === 'table') {
    return (
      <mesh receiveShadow position={object.position} rotation={rotation}>
        <boxGeometry args={object.scale} />
        <meshStandardMaterial color="#101010" roughness={0.88} metalness={0.12} />
      </mesh>
    );
  }

  if (object.type === 'mug') {
    return (
      <group position={object.position} rotation={rotation}>
        <mesh castShadow>
          <cylinderGeometry args={[0.11, 0.1, 0.28, 36]} />
          <meshStandardMaterial color="#d8d8d8" roughness={0.45} metalness={0.08} />
        </mesh>
        <mesh castShadow position={[0.11, 0.01, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <torusGeometry args={[0.072, 0.016, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#d8d8d8" roughness={0.45} />
        </mesh>
        <ObjectLabel label={object.label} position={[0, 0.36, 0]} />
      </group>
    );
  }

  if (object.type === 'bowl') {
    return (
      <group position={object.position} rotation={rotation}>
        <mesh castShadow scale={object.scale}>
          <sphereGeometry args={[0.16, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
        </mesh>
      </group>
    );
  }

  if (object.type === 'zone') {
    return (
      <group position={object.position} rotation={rotation}>
        <mesh receiveShadow scale={object.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#f2f2f2" transparent opacity={0.16} />
        </mesh>
        <mesh scale={[object.scale[0], 0.012, object.scale[2]]}>
          <boxGeometry args={[1.08, 1, 1.08]} />
          <meshBasicMaterial color="#f2f2f2" wireframe transparent opacity={0.58} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh castShadow position={object.position} rotation={rotation} scale={object.scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#202020" roughness={0.72} />
    </mesh>
  );
}

function RobotActor() {
  return (
    <group position={[-0.72, 0, -0.05]}>
      <mesh castShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.17, 0.19, 0.12, 40]} />
        <meshStandardMaterial color="#191919" roughness={0.5} metalness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 0.38, 0]} rotation={[0, 0, -0.14]}>
        <boxGeometry args={[0.08, 0.62, 0.08]} />
        <meshStandardMaterial color="#262626" roughness={0.48} metalness={0.3} />
      </mesh>
      <mesh castShadow position={[0.06, 0.72, 0]}>
        <sphereGeometry args={[0.074, 32, 18]} />
        <meshStandardMaterial color="#d7d7d7" emissive="#242424" emissiveIntensity={0.35} />
      </mesh>
      <mesh castShadow position={[0.31, 0.83, -0.02]} rotation={[0.05, 0, -1.03]}>
        <boxGeometry args={[0.065, 0.56, 0.065]} />
        <meshStandardMaterial color="#262626" roughness={0.48} metalness={0.3} />
      </mesh>
      <group position={[0.56, 0.7, -0.07]} rotation={[0.05, 0, -0.92]}>
        <mesh castShadow>
          <boxGeometry args={[0.06, 0.11, 0.18]} />
            <meshStandardMaterial color="#d7d7d7" roughness={0.35} />
        </mesh>
        <mesh castShadow position={[0.01, 0.09, 0.065]}>
          <boxGeometry args={[0.026, 0.17, 0.028]} />
            <meshStandardMaterial color="#f4f4f4" />
        </mesh>
        <mesh castShadow position={[0.01, 0.09, -0.065]}>
          <boxGeometry args={[0.026, 0.17, 0.028]} />
            <meshStandardMaterial color="#f4f4f4" />
        </mesh>
      </group>
      <ObjectLabel label="robot gripper" position={[0.52, 0.98, -0.08]} />
    </group>
  );
}

function ObjectLabel({ label, position = [0, 0.22, 0] }: { label: string; position?: [number, number, number] }) {
  return (
    <Html position={position} center distanceFactor={7}>
      <span className="scene-label">{label}</span>
    </Html>
  );
}

function FailureMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.048, 24, 16]} />
        <meshBasicMaterial color="#cfcfcf" />
      </mesh>
      <Html position={[0, 0.08, 0]} center distanceFactor={7}>
        <span className="scene-marker scene-marker-danger">failure contact</span>
      </Html>
    </group>
  );
}

function SuccessMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.052, 24, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Html position={[0, 0.08, 0]} center distanceFactor={7}>
        <span className="scene-marker scene-marker-success">retest passed</span>
      </Html>
    </group>
  );
}
