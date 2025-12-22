import {
    BaseEdge,
    type EdgeProps,
    getSimpleBezierPath,
} from "@xyflow/react";

export const TemporaryEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
}: EdgeProps) => {
    const [edgePath] = getSimpleBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Calculate Euclidean distance as a proxy for path length
    // Speed matched to the Animated edge which takes 2s to traverse the full length
    // Adjusted factor to 75 to better match visual perception of speed relative to the dot
    const length = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
    const duration = length > 0 ? 75 / length : 0;

    return (
        <BaseEdge
            className="stroke-1 stroke-ring"
            id={id}
            path={edgePath}
            style={{
                ...style,
                strokeDasharray: "5, 5",
                animation: duration > 0 ? `dash ${duration}s linear infinite` : "none",
            }}
        />
    );
};
