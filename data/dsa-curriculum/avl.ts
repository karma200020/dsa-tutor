import type { AuthoredAlgorithm } from "./lesson";

export const avlAlgorithms: AuthoredAlgorithm[] = [{
  id: "topic-tree-avl-balance", moduleId: "mod-advanced-trees", title: "Balanced Search Trees: AVL Insertion and Rotations",
  intuition: "A rotation changes local parent-child links while preserving inorder order. Maintaining each node's height allows the first unbalanced ancestor to be repaired after insertion.",
  contract: "Maintain a set of unique int keys with AVL insertion and lookup. Duplicate insertion leaves the set unchanged. Return the possibly new root after insertion; callers must retain it and own/delete all nodes. Deletion is deliberately outside this implementation.",
  prerequisites: "BST ordering, height-balanced-tree checks, recursion and pointer rewiring.",
  cues: "Online ordered membership/range operations needing logarithmic worst-case height rather than a potentially skewed plain BST.",
  invariant: "Every node obeys strict BST order and abs(height(left)-height(right))<=1. A right rotation at y preserves the middle subtree between x<y: it becomes y's left child while y becomes x's right child. Recompute the lower node's height before the upper node's. Single LL/RR or double LR/RL rotations restore the balance after insertion without changing the inorder sequence.",
  walkthrough: { input: "insert 30,10,20", output: "root20, left10, right30, height2", explanation: "Before repair,30 has left height2 and right0; its child10 is right-heavy. First rotate left at10, making20 the left child of30 with10 below it. Then rotate right at30, yielding20 as root. The inorder sequence10,20,30 is unchanged throughout." },
  code: `#include <bits/stdc++.h>
using namespace std;
struct Node{int key,height=1;Node*left=nullptr,*right=nullptr;explicit Node(int k):key(k){}};
int height(Node*u){return u?u->height:0;}
void pull(Node*u){u->height=1+max(height(u->left),height(u->right));}
int balance(Node*u){return height(u->left)-height(u->right);}
Node* rotateRight(Node*y){
  Node*x=y->left,*middle=x->right;x->right=y;y->left=middle;pull(y);pull(x);return x;
}
Node* rotateLeft(Node*x){
  Node*y=x->right,*middle=y->left;y->left=x;x->right=middle;pull(x);pull(y);return y;
}
Node* insert(Node*u,int key){
  if(!u)return new Node(key);
  if(key<u->key)u->left=insert(u->left,key);else if(key>u->key)u->right=insert(u->right,key);else return u;
  pull(u);
  if(balance(u)>1){if(balance(u->left)<0)u->left=rotateLeft(u->left);return rotateRight(u);}
  if(balance(u)<-1){if(balance(u->right)>0)u->right=rotateRight(u->right);return rotateLeft(u);}
  return u;
}
bool contains(Node*u,int key){while(u){if(key==u->key)return true;u=key<u->key?u->left:u->right;}return false;}
void destroy(Node*u){if(u){destroy(u->left);destroy(u->right);delete u;}}`,
  time: "Lookup and insertion O(log n) worst-case; each local rotation O(1).",
  space: "O(n) nodes; O(log n) insertion stack and O(1) iterative lookup workspace.",
  boundaries: "Always assign root=insert(root,key), since rotations can change the root. Recompute heights after rewiring, not before. Duplicates are ignored under set semantics; multisets need explicit multiplicity. Deletion can require rebalancing several ancestors and is not the insertion routine run backward.",
  alternatives: "std::set/std::map supply balanced ordered containers without exposing a specific AVL implementation. Red-black trees relax balance and typically perform fewer update rotations. A sorted vector has efficient searches but O(n) insertion shifts.",
  practice: [
    { variation: "Lower bound", tip: "Record the smallest seen key >=target and continue left when a candidate is found.", snippet: "optional<int> lowerBound(Node*u,int key){\n  optional<int>best;\n  while(u){if(u->key>=key){best=u->key;u=u->left;}else u=u->right;}\n  return best;\n}" },
    { variation: "Range enumeration", tip: "Prune subtrees that cannot intersect [lo,hi]. Runtime is O(log n+k) for k returned keys.", snippet: "void rangeKeys(Node*u,int lo,int hi,vector<int>&out){\n  if(!u)return;\n  if(u->key>lo)rangeKeys(u->left,lo,hi,out);\n  if(lo<=u->key&&u->key<=hi)out.push_back(u->key);\n  if(u->key<hi)rangeKeys(u->right,lo,hi,out);\n}" },
    { variation: "Audit stored heights after rotations", tip: "Recursively compare stored height against computed height while checking the balance factor. This catches stale metadata even when inorder still looks correct.", snippet: "int check(Node*u){\n  if(!u)return 0;int l=check(u->left),r=check(u->right);\n  if(abs(l-r)>1||u->height!=1+max(l,r))throw logic_error(\"AVL invariant\");\n  return u->height;\n}" }
  ],
  faq: [
    { question: "Why do AVL heights remain logarithmic?", answer: "A height-h AVL tree needs at least one height-(h-1) subtree and one height-(h-2) subtree, giving a Fibonacci-like minimum node recurrence. Node count therefore grows exponentially with height." },
    { question: "Do rotations preserve all BST search results?", answer: "Yes, because the inorder order is unchanged. The middle subtree's keys remain greater than the lower pivot and smaller than the upper pivot." }
  ],
}];
