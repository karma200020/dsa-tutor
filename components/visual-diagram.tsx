import React, { useState } from 'react';
import styles from './visual-diagram.module.css';

interface VisualDiagramProps {
  diagramType: 'two-sum' | 'sliding-window' | 'floyd-cycle' | 'tree-traversal' | 'consistent-hash' | 'url-shortener';
  title: string;
  description: string;
}

export const VisualDiagram: React.FC<VisualDiagramProps> = ({ 
  diagramType, 
  title, 
  description 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  return (
    <div className={styles.diagramContainer}>
      <div className={styles.header}>
        <h3>{title}</h3>
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.canvasArea}>
        {diagramType === 'two-sum' && <TwoSumDiagram />}
        {diagramType === 'sliding-window' && <SlidingWindowDiagram />}
        {diagramType === 'floyd-cycle' && <FloydCycleDiagram isAnimating={isAnimating} />}
        {diagramType === 'tree-traversal' && <TreeTraversalDiagram />}
        {diagramType === 'consistent-hash' && <ConsistentHashingDiagram isAnimating={isAnimating} />}
        {diagramType === 'url-shortener' && <URLShortenerArchitecture />}
      </div>

      <div className={styles.controls}>
        <button 
          className={styles.animateButton}
          onClick={() => setIsAnimating(!isAnimating)}
        >
          {isAnimating ? '⏸ Pause' : '▶ Animate'}
        </button>
      </div>

      <div className={styles.explanation}>
        <h4>Key Points:</h4>
        <ul>
          <li>Observe the algorithm behavior</li>
          <li>Try step-through for detailed understanding</li>
          <li>Click elements for more information</li>
        </ul>
      </div>
    </div>
  );
};

// ============================================
// INDIVIDUAL DIAGRAM COMPONENTS
// ============================================

const TwoSumDiagram: React.FC = () => {
  const [target] = useState(9);
  const [array] = useState([2, 7, 11, 15]);
  const [step, setStep] = useState(0);

  const steps = [
    { index: 0, element: 2, complement: 7, found: false, map: {} },
    { index: 1, element: 7, complement: 2, found: true, map: { '2': 0 }, solution: [0, 1] },
  ];

  const current = steps[Math.min(step, steps.length - 1)];

  return (
    <svg viewBox="0 0 800 400" className={styles.svg}>
      {/* Array visualization */}
      <text x="50" y="30" className={styles.label}>Array:</text>
      {array.map((val, idx) => (
        <g key={`arr-${idx}`}>
          <rect
            x={100 + idx * 80}
            y="10"
            width="60"
            height="60"
            className={`${styles.arrayBox} ${idx === current.index ? styles.activeBox : ''}`}
          />
          <text x={130 + idx * 80} y="45" textAnchor="middle" className={styles.text}>
            {val}
          </text>
          <text x={130 + idx * 80} y="90" textAnchor="middle" className={styles.index}>
            [{idx}]
          </text>
        </g>
      ))}

      {/* Hash map visualization */}
      <text x="50" y="150" className={styles.label}>Hash Map:</text>
      <rect x="50" y="160" width="300" height="120" className={styles.mapBox} />
      {Object.entries(current.map).map(([key, value], idx) => (
        <text key={`map-${idx}`} x="70" y={190 + idx * 30} className={styles.mapEntry}>
          {key} → {value as string}
        </text>
      ))}

      {/* Current step info */}
      <text x="50" y="320" className={styles.label}>Current Step:</text>
      <text x="70" y="350" className={styles.explanation}>
        Element: {current.element}, Complement: {current.complement}, Found: {current.found ? '✓ YES' : '✗ NO'}
      </text>

      {current.found && (
        <text x="70" y="380" className={styles.solution}>
          ✓ Solution: {JSON.stringify(current.solution)}
        </text>
      )}
    </svg>
  );
};

const SlidingWindowDiagram: React.FC = () => {
  const [s] = useState('abcabcbb');
  const [windowStart, setWindowStart] = useState(0);
  const [windowEnd, setWindowEnd] = useState(2);

  return (
    <svg viewBox="0 0 1000 300" className={styles.svg}>
      {/* String visualization */}
      <text x="50" y="30" className={styles.label}>String: &quot;abcabcbb&quot;</text>
      
      {s.split('').map((char, idx) => (
        <g key={`char-${idx}`}>
          <rect
            x={100 + idx * 50}
            y="40"
            width="40"
            height="60"
            className={`${styles.charBox} 
              ${idx >= windowStart && idx <= windowEnd ? styles.inWindow : ''}`}
          />
          <text x={120 + idx * 50} y="75" textAnchor="middle" className={styles.char}>
            {char}
          </text>
        </g>
      ))}

      {/* Pointers */}
      <line x1={100 + windowStart * 50 + 20} y1="110" x2={100 + windowStart * 50 + 20} y2="140" 
            className={styles.leftPointer} strokeWidth="3" />
      <text x={100 + windowStart * 50 + 20} y="160" textAnchor="middle" className={styles.pointerLabel}>
        left
      </text>

      <line x1={100 + windowEnd * 50 + 20} y1="110" x2={100 + windowEnd * 50 + 20} y2="140" 
            className={styles.rightPointer} strokeWidth="3" />
      <text x={100 + windowEnd * 50 + 20} y="160" textAnchor="middle" className={styles.pointerLabel}>
        right
      </text>

      {/* Controls */}
      <g>
        <text x="50" y="220" className={styles.label}>Window:</text>
        <text x="200" y="220" className={styles.explanation}>
          &quot;{s.substring(windowStart, windowEnd + 1)}&quot; (length: {windowEnd - windowStart + 1})
        </text>
        
        <button
          onClick={() => setWindowEnd(Math.min(windowEnd + 1, s.length - 1))}
          className={styles.button}
          style={{ left: '500px' }}
        >
          Expand →
        </button>
        
        <button
          onClick={() => setWindowStart(Math.min(windowStart + 1, windowEnd))}
          className={styles.button}
          style={{ left: '650px' }}
        >
          Shrink ←
        </button>
      </g>
    </svg>
  );
};

const FloydCycleDiagram: React.FC<{ isAnimating: boolean }> = ({ isAnimating }) => {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (!isAnimating) return;
    const timer = setInterval(() => {
      setStep(s => (s + 1) % 8);
    }, 500);
    return () => clearInterval(timer);
  }, [isAnimating]);

  const nodes = [
    { id: 1, x: 150, y: 100 },
    { id: 2, x: 250, y: 80 },
    { id: 3, x: 350, y: 100 },
    { id: 4, x: 380, y: 200 },
    { id: 5, x: 300, y: 280 },
  ];

  const slowPositions = [0, 1, 2, 3, 4, 0, 1, 2];
  const fastPositions = [0, 2, 4, 1, 3, 0, 2, 4];

  return (
    <svg viewBox="0 0 500 400" className={styles.svg}>
      <text x="50" y="30" className={styles.label}>Floyd&apos;s Cycle Detection</text>

      {/* Nodes */}
      {nodes.map((node, idx) => {
        const isCycleNode = idx >= 2;
        return (
          <g key={`node-${idx}`}>
            <circle
              cx={node.x}
              cy={node.y}
              r="30"
              className={`${styles.node} ${isCycleNode ? styles.cycleNode : ''}`}
            />
            <text x={node.x} y={node.y} textAnchor="middle" dy="0.3em" className={styles.nodeLabel}>
              {node.id}
            </text>
          </g>
        );
      })}

      {/* Edges (linked list next pointers) */}
      <line x1="180" y1="100" x2="220" y2="80" className={styles.edge} strokeWidth="2" />
      <line x1="280" y1="80" x2="320" y2="100" className={styles.edge} strokeWidth="2" />
      <line x1="350" y1="130" x2="370" y2="170" className={styles.edge} strokeWidth="2" />
      <line x1="350" y1="230" x2="320" y2="260" className={styles.edge} strokeWidth="2" />
      <path d="M 300 310 Q 250 350 250 130" className={styles.edge} fill="none" strokeWidth="2" />

      {/* Pointers animation */}
      {/* Slow pointer */}
      <circle
        cx={nodes[slowPositions[step]].x}
        cy={nodes[slowPositions[step]].y}
        r="20"
        className={styles.slowPointer}
        fill="none"
        strokeWidth="2"
      />
      <text x={nodes[slowPositions[step]].x} y={nodes[slowPositions[step]].y - 50} 
            textAnchor="middle" className={styles.pointerLabel}>
        Slow (1x)
      </text>

      {/* Fast pointer */}
      <circle
        cx={nodes[fastPositions[step]].x}
        cy={nodes[fastPositions[step]].y}
        r="20"
        className={styles.fastPointer}
        fill="none"
        strokeWidth="2"
      />
      <text x={nodes[fastPositions[step]].x} y={nodes[fastPositions[step]].y + 50}
            textAnchor="middle" className={styles.pointerLabel}>
        Fast (2x)
      </text>

      {/* Status */}
      {step >= 5 && (
        <text x="50" y="360" className={styles.solution}>
          ✓ Cycle detected! Pointers meet at node {nodes[slowPositions[step]].id}
        </text>
      )}
    </svg>
  );
};

const TreeTraversalDiagram: React.FC = () => {
  const [traversalType, setTraversalType] = React.useState<'preorder' | 'inorder' | 'postorder' | 'bfs'>('preorder');

  const traversals = {
    preorder: '1 → 2 → 4 → 5 → 3',
    inorder: '4 → 2 → 5 → 1 → 3',
    postorder: '4 → 5 → 2 → 3 → 1',
    bfs: '1 → 2 → 3 → 4 → 5'
  };

  return (
    <svg viewBox="0 0 600 450" className={styles.svg}>
      <text x="50" y="30" className={styles.label}>Tree Traversals</text>

      {/* Tree structure */}
      {/* Root */}
      <circle cx="300" cy="60" r="25" className={styles.treeNode} />
      <text x="300" y="70" textAnchor="middle" className={styles.nodeLabel}>1</text>

      {/* Level 2 */}
      <circle cx="180" cy="150" r="25" className={styles.treeNode} />
      <text x="180" y="160" textAnchor="middle" className={styles.nodeLabel}>2</text>
      
      <circle cx="420" cy="150" r="25" className={styles.treeNode} />
      <text x="420" y="160" textAnchor="middle" className={styles.nodeLabel}>3</text>

      {/* Level 3 */}
      <circle cx="120" cy="240" r="25" className={styles.treeNode} />
      <text x="120" y="250" textAnchor="middle" className={styles.nodeLabel}>4</text>

      <circle cx="240" cy="240" r="25" className={styles.treeNode} />
      <text x="240" y="250" textAnchor="middle" className={styles.nodeLabel}>5</text>

      {/* Edges */}
      <line x1="300" y1="85" x2="180" y2="125" className={styles.edge} strokeWidth="2" />
      <line x1="300" y1="85" x2="420" y2="125" className={styles.edge} strokeWidth="2" />
      <line x1="180" y1="175" x2="120" y2="215" className={styles.edge} strokeWidth="2" />
      <line x1="180" y1="175" x2="240" y2="215" className={styles.edge} strokeWidth="2" />

      {/* Traversal selector */}
      <text x="50" y="340" className={styles.label}>Traversal Type:</text>
      {(['preorder', 'inorder', 'postorder', 'bfs'] as const).map((type) => (
        <button
          key={type}
          className={`${styles.traversalButton} ${traversalType === type ? styles.active : ''}`}
          onClick={() => setTraversalType(type)}
          style={{ left: `${150 + (['preorder', 'inorder', 'postorder', 'bfs'].indexOf(type) * 120)}px` }}
        >
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      ))}

      {/* Order display */}
      <text x="50" y="400" className={styles.label}>Order:</text>
      <text x="150" y="400" className={styles.explanation}>
        {traversals[traversalType]}
      </text>
    </svg>
  );
};

const ConsistentHashingDiagram: React.FC<{ isAnimating: boolean }> = ({ isAnimating }) => {
  const [failedNode, setFailedNode] = React.useState<number | null>(null);

  return (
    <svg viewBox="0 0 600 600" className={styles.svg}>
      <text x="50" y="30" className={styles.label}>Consistent Hashing - Cache Distribution</text>

      {/* Hash ring */}
      <circle cx="300" cy="300" r="200" fill="none" stroke="#666" strokeWidth="2" />

      {/* Nodes on ring */}
      {[0, 1, 2, 3].map((n) => {
        const angle = (n * 90 * Math.PI) / 180;
        const x = 300 + 200 * Math.cos(angle);
        const y = 300 + 200 * Math.sin(angle);
        const isFailed = n === failedNode;

        return (
          <g key={`node-${n}`}>
            <circle
              cx={x}
              cy={y}
              r="20"
              className={`${styles.ringNode} ${isFailed ? styles.failedNode : ''}`}
            />
            <text x={x} y={y} textAnchor="middle" dy="0.3em" className={styles.nodeLabel}>
              N{n + 1}
            </text>
          </g>
        );
      })}

      {/* Keys on ring */}
      {['K1', 'K2', 'K3', 'K4', 'K5'].map((k, idx) => {
        const angle = ((idx * 72 + 45) * Math.PI) / 180;
        const x = 300 + 150 * Math.cos(angle);
        const y = 300 + 150 * Math.sin(angle);

        return (
          <g key={`key-${idx}`}>
            <circle cx={x} cy={y} r="12" className={styles.keyPoint} />
            <text x={x} y={y - 25} textAnchor="middle" className={styles.keyLabel}>
              {k}
            </text>
          </g>
        );
      })}

      {/* Control */}
      <text x="50" y="520" className={styles.label}>Node Failure:</text>
      <button
        className={styles.button}
        onClick={() => setFailedNode(failedNode === null ? 0 : null)}
        style={{ left: '200px', top: '500px' }}
      >
        {failedNode === null ? 'Fail N1' : 'Recover N1'}
      </button>

      {failedNode !== null && (
        <text x="50" y="560" className={styles.explanation}>
          ✓ Only ~25% of keys rehashed (nearby keys). Better than modulo hash!
        </text>
      )}
    </svg>
  );
};

const URLShortenerArchitecture: React.FC = () => {
  return (
    <svg viewBox="0 0 1000 500" className={styles.svg}>
      <text x="50" y="30" className={styles.label}>URL Shortener System Architecture</text>

      {/* Components */}
      {/* Client */}
      <rect x="50" y="80" width="120" height="80" className={styles.component} />
      <text x="110" y="130" textAnchor="middle" className={styles.componentLabel}>Client</text>

      {/* API Gateway */}
      <rect x="250" y="80" width="120" height="80" className={styles.component} />
      <text x="310" y="130" textAnchor="middle" className={styles.componentLabel}>API Gateway</text>

      {/* Encode Service */}
      <rect x="450" y="50" width="120" height="60" className={styles.component} />
      <text x="510" y="85" textAnchor="middle" className={styles.componentLabel}>Encode</text>

      {/* Redirect Service */}
      <rect x="450" y="130" width="120" height="60" className={styles.component} />
      <text x="510" y="165" textAnchor="middle" className={styles.componentLabel}>Redirect</text>

      {/* Database */}
      <rect x="650" y="80" width="120" height="80" className={styles.database} />
      <text x="710" y="130" textAnchor="middle" className={styles.componentLabel}>DB</text>

      {/* Cache */}
      <rect x="650" y="200" width="120" height="80" className={styles.cache} />
      <text x="710" y="250" textAnchor="middle" className={styles.componentLabel}>Redis Cache</text>

      {/* Analytics */}
      <rect x="850" y="200" width="120" height="80" className={styles.component} />
      <text x="910" y="250" textAnchor="middle" className={styles.componentLabel}>Analytics</text>

      {/* Arrows */}
      <line x1="170" y1="120" x2="250" y2="120" className={styles.arrow} strokeWidth="2" markerEnd="url(#arrowhead)" />
      <line x1="370" y1="120" x2="450" y2="80" className={styles.arrow} strokeWidth="2" markerEnd="url(#arrowhead)" />
      <line x1="370" y1="120" x2="450" y2="160" className={styles.arrow} strokeWidth="2" markerEnd="url(#arrowhead)" />
      
      <line x1="570" y1="80" x2="650" y2="110" className={styles.arrow} strokeWidth="2" markerEnd="url(#arrowhead)" />
      <line x1="570" y1="160" x2="650" y2="110" className={styles.arrow} strokeWidth="2" markerEnd="url(#arrowhead)" />
      
      <line x1="770" y1="240" x2="850" y2="240" className={styles.arrow} strokeWidth="2" markerEnd="url(#arrowhead)" />

      {/* Legend */}
      <text x="50" y="350" className={styles.label}>Flow:</text>
      <text x="50" y="380" className={styles.explanation}>
        1. Create: Client → API → Encode → DB & Cache
      </text>
      <text x="50" y="410" className={styles.explanation}>
        2. Retrieve: Client → API → Redirect → Cache/DB
      </text>
      <text x="50" y="440" className={styles.explanation}>
        3. Analytics track all redirects
      </text>

      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="#666" />
        </marker>
      </defs>
    </svg>
  );
};

export default VisualDiagram;
