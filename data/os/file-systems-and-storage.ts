import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-os-file-systems-and-storage - "OS: File Systems and Storage" (5 topics).
export const osFileSystemsTopics: Topic[] = [
  {
    id: "topic-os-inodes-and-file-metadata",
    moduleId: "mod-os-file-systems-and-storage",
    title: "Inodes, Directories, and the Path Resolution Machine",
    intuition:
      "A Unix filesystem separates a file's identity from its name completely. The inode holds everything about a file except its name - size, permissions, timestamps, link count, and the block pointers - while a directory is merely a table mapping names to inode numbers. That single separation explains hard links, why deleting an open file does not free its space, why rename is atomic, and why moving a file within a filesystem is instant while moving it across one is a copy. Almost every filesystem interview question is a consequence of this design.",
    complexity: {
      time:
        "Inode lookup by number is O(1) - it is an index into the inode table. Path resolution is O(depth), one directory lookup per component, though the dentry cache makes repeated lookups effectively free. Directory lookup within a component is O(n) for a linear directory and O(log n) or O(1) for hashed or B-tree directories such as ext4's htree.",
      space:
        "An inode is typically 256 bytes in ext4, holding 12 direct block pointers plus single, double, and triple indirect pointers, which supports files into the terabytes. Modern filesystems use extents instead - a start block and a length - which describe a large contiguous file in a handful of entries rather than millions of pointers."
    },
    lesson: [
      {
        title: "The Inode and What It Does Not Contain",
        content:
          "An inode is a fixed-size structure identified by a number, unique within a filesystem, that records everything about a file except its name and its data: the file type, permission bits, owner and group, size, link count, the three timestamps, and the map from logical file offsets to physical blocks. The name is deliberately absent, because names live in directories, and a file may have several names or none at all. The link count records how many directory entries refer to this inode, and the space is freed only when both that count and the count of open file descriptors reach zero - which is why deleting a file that a process still has open does not reclaim the space until the process closes it or exits, a classic production surprise when df and du disagree. The block map is where filesystems differ most: traditional Unix used direct pointers for the first blocks and then single, double, and triple indirect blocks, which makes small files cheap and large files require several indirections; modern filesystems use extents, describing a run of contiguous blocks as a start and a length, which collapses a large sequential file to a handful of records.",
        diagram: asciiDiagram(`Name and identity are separate

  DIRECTORY "/home/ana"  - just a table of (name ──▶ inode number)
  ┌──────────────┬────────────┐
  │ name         │ inode      │
  ├──────────────┼────────────┤
  │ .            │   1024     │
  │ ..           │    512     │
  │ report.txt   │   8891     │──┐
  │ backup.txt   │   8891     │──┤  SAME inode - a HARD LINK
  │ notes.md     │   9042     │  │
  └──────────────┴────────────┘  │
                                 ▼
  INODE 8891  (no name anywhere in here)
  ┌─────────────────────────────────────────────┐
  │ type        regular file                    │
  │ mode        rw-r--r--                       │
  │ uid / gid   1000 / 1000                     │
  │ size        14823 bytes                     │
  │ LINK COUNT  2          ◀── two names        │
  │ atime / mtime / ctime                       │
  │ ┌─ direct[0..11]  ──▶ blocks 4400..4411     │
  │ ├─ single indirect ──▶ block of pointers    │
  │ ├─ double indirect ──▶ block of blocks of.. │
  │ └─ triple indirect ──▶ ...                  │
  │   (modern FS: EXTENTS - {start, length})    │
  └─────────────────────────────────────────────┘
                    │
                    ▼
              ┌──────────────────────┐
              │  DATA BLOCKS         │
              └──────────────────────┘

  CONSEQUENCES OF THE SEPARATION
    hard link      = another directory entry, same inode
                     ──▶ link count 2, no data copied
    rm             = remove the ENTRY, decrement link count
                     ──▶ data freed only at count 0 AND
                         zero open file descriptors
    delete an OPEN file
                   ──▶ name gone, space NOT freed until close
                   ──▶ df says full, du says empty  ◀── classic
                       find it with: lsof +L1
    mv within a FS = rewrite one directory entry. INSTANT,
                     regardless of file size.
    mv across a FS = copy every byte + delete. Not atomic.
    hard link to a DIRECTORY = forbidden (would create cycles
                     that the reference counting cannot free)`)
      },
      {
        title: "Path Resolution and the Dentry Cache",
        content:
          "Opening /home/ana/report.txt is not one lookup but a walk. The kernel starts at the root inode, reads the root directory to find the entry for home and its inode number, reads that inode, reads that directory to find ana, and so on down to the final component - with a permission check at every level, because execute permission on a directory means the right to traverse it. Done literally, that would be several disk reads per open, so Linux caches the results in the dentry cache, which maps a parent directory and a name to the resolved inode, and in the inode cache. With a warm cache, resolving a deep path costs a few hash lookups and no I/O at all, which is why the dentry cache is usually one of the largest slab caches on a busy system. The walk also handles symbolic links, which are inodes whose data is a path string: encountering one restarts resolution from that string, with a limit of forty resolutions to break loops. Bind mounts, mount points, and containers complicate this further, since crossing a mount point switches to a different filesystem's root, and namespaces mean the same path can resolve differently for different processes.",
        codeExample: `/* Path resolution, and what it costs. */

open("/home/ana/report.txt", O_RDONLY);

/*  1. start at root inode (or CWD for a relative path)
    2. read "/"      directory ──▶ find "home" ──▶ inode 512
         check EXECUTE permission on "/"      (x = may traverse)
    3. read inode 512, read directory ──▶ "ana" ──▶ inode 1024
         check EXECUTE permission on /home
    4. read inode 1024, read directory ──▶ "report.txt" ──▶ 8891
         check EXECUTE permission on /home/ana
    5. read inode 8891, check READ permission on the FILE
    6. allocate a struct file, install a descriptor       */

/* Cold cache: ~6 disk reads. Warm dentry cache: 0 reads.  */

// slabtop -s c        # dentry is usually the largest cache
// cat /proc/slabinfo | grep -E 'dentry|inode_cache'
// sysctl vm.vfs_cache_pressure   # how eagerly to reclaim them

/* SYMLINKS restart resolution */
/*   /home/ana/link ──▶ "../bob/data.txt"
     resolution jumps to that path and continues.
     Limit: 40 link traversals ──▶ ELOOP.              */

/* THE TOCTOU TRAP - why path-based checks are unsafe */
if (access("/tmp/f", W_OK) == 0)   /* check  ◀── path resolved */
    fd = open("/tmp/f", O_WRONLY); /* use    ◀── resolved AGAIN */
/*   an attacker can swap /tmp/f for a symlink in between.
     FIX: resolve ONCE, then operate on the descriptor:      */
fd = open("/tmp/f", O_WRONLY | O_NOFOLLOW);
fstat(fd, &st);                    /* checks the SAME object */

/* The *at() family: resolve relative to an open directory fd,
   which pins the directory and removes the race entirely.   */
int dfd = open("/tmp", O_DIRECTORY | O_RDONLY);
int fd  = openat(dfd, "f", O_WRONLY | O_NOFOLLOW);
// unlinkat, renameat2, fstatat, mkdirat, linkat ...

/* Directory lookup cost WITHIN one component:
     linear scan (old ext2)        O(n)  ──▶ 100k files = slow
     hashed htree (ext4)           O(1)ish
     B-tree (XFS, btrfs, ZFS)      O(log n)
   ▶ "why is ls slow in this directory" is usually a linear
     scan plus a stat() per entry (which is a second lookup). */`
      },
      {
        title: "Hard Links, Symlinks, and Atomic Rename",
        content:
          "A hard link is simply another directory entry pointing at the same inode, so both names are equally real, neither is the original, and the file exists as long as the link count is positive. Hard links cannot cross filesystems, because inode numbers are only meaningful within one filesystem, and cannot point to directories, because that would create cycles that reference counting could not reclaim. A symbolic link is a different thing entirely: an inode whose data is a path string, resolved at use time, which can cross filesystems, can point at directories, and can dangle if the target disappears. The most operationally important consequence of the name-inode split is that rename within a filesystem is atomic: it rewrites a directory entry, and any observer sees either the old name or the new one, never neither and never a partial file. That guarantee is the foundation of the write-to-temporary-then-rename idiom that essentially every program uses for safe file updates, and getting it right also requires fsync of the file before the rename and fsync of the directory after it, since the rename itself is metadata that must reach stable storage before the update is durable across a crash.",
        diagram: asciiDiagram(`Hard link vs symlink vs the atomic rename idiom

  HARD LINK                        SYMBOLIC LINK
  ┌──────────┐                     ┌──────────┐
  │ "a.txt"  │──┐                  │ "link"   │──▶ inode 9999
  ├──────────┤  │                  └──────────┘      │
  │ "b.txt"  │──┤                                    ▼
  └──────────┘  │                    inode 9999 is a SYMLINK
                ▼                    its DATA is the string
          inode 8891                 "/home/ana/report.txt"
          link count = 2                       │
          ▲ both names equal                   ▼ resolved at
          ▲ no "original"                        USE time
                                     ──▶ can dangle
  cannot cross filesystems           ──▶ CAN cross filesystems
  cannot point at a directory        ──▶ CAN point at a directory
  survives target rename             ──▶ BREAKS on target rename

  THE ATOMIC UPDATE IDIOM - the single most useful thing here
  ┌───────────────────────────────────────────────────────────┐
  │  fd = open("cfg.json.tmp", O_CREAT|O_WRONLY|O_TRUNC);     │
  │  write(fd, data, len);                                     │
  │  fsync(fd);            ◀── 1. DATA is durable             │
  │  close(fd);                                                │
  │  rename("cfg.json.tmp", "cfg.json");  ◀── 2. ATOMIC swap  │
  │  dfd = open(".", O_DIRECTORY); fsync(dfd); ◀── 3. the      │
  │  close(dfd);                       RENAME is durable      │
  └───────────────────────────────────────────────────────────┘
     ▼ what a concurrent reader sees, at every instant:
        the COMPLETE old file, or the COMPLETE new file.
        Never a truncated file. Never a missing file.

  MISS step 1 ──▶ crash leaves cfg.json existing but EMPTY
                  (rename recorded, data not yet written)
  MISS step 3 ──▶ crash may lose the rename entirely
  ▶ Both were real, widely-shipped bugs.

  RENAME on top of an existing file
     unlinks the old target as part of the same atomic step
     ──▶ old inode's link count drops; readers holding it OPEN
         keep reading the old contents safely until they close.`)
      }
    ],
    examples: [
      {
        title: "df and du disagreeing by 40 GB",
        input: "df reports the filesystem 95 percent full; du over the whole tree accounts for far less.",
        output: "A deleted file is still held open by a running process.",
        explanation:
          "Step 1: rm removes a directory entry and decrements the link count, but space is freed only when both link count and open descriptor count reach zero.\nStep 2: A long-running process - typically a daemon with a rotated log still open - holds the descriptor, so the blocks remain allocated.\nStep 3: du walks names and cannot see the file at all, while df reads allocation metadata and does.\nStep 4: lsof +L1 lists files with link count zero and non-zero descriptors; restarting or signalling the process to reopen its log frees the space immediately."
      },
      {
        title: "A configuration file found empty after a power loss",
        input: "A service writes its config in place; after a crash the file exists but is zero bytes.",
        output: "In-place truncate and rewrite has no atomicity.",
        explanation:
          "Step 1: Opening with O_TRUNC immediately makes the file empty, and the new contents are only in the page cache.\nStep 2: A crash before writeback leaves the truncation durable and the data lost.\nStep 3: The correct idiom writes to a temporary file, fsyncs it, renames over the target, and fsyncs the directory.\nStep 4: Rename within a filesystem is atomic, so any reader sees either the complete old file or the complete new one - and the two fsyncs are what make that hold across a crash rather than only across a process death."
      },
      {
        title: "ls taking thirty seconds in one directory",
        input: "A directory contains 400,000 files; listing it with details is extremely slow.",
        output: "Directory scan plus one inode lookup per entry.",
        explanation:
          "Step 1: Reading the directory returns names and inode numbers, which on a hashed or B-tree directory is reasonably fast.\nStep 2: ls with details, or any glob that needs file types, calls stat on each entry, and each stat is a separate inode read.\nStep 3: Those inode reads are scattered, so on cold cache they are hundreds of thousands of random I/Os.\nStep 4: Sharding into subdirectories by a hash prefix, as Git does with its object store, keeps directories small; plain ls without sorting or stat is dramatically faster because it avoids the per-entry lookup."
      }
    ],
    tips: [
      "Lead with the name-versus-inode separation; nearly every follow-up question in this area is a corollary of it.",
      "State that space is freed only when link count and open descriptors both reach zero - it explains the df/du discrepancy immediately.",
      "When durability comes up, give the full four-step rename idiom including both fsyncs; omitting the directory fsync is the classic incomplete answer."
    ],
    tricks: [
      "Hard links have no original - that phrasing makes the symmetry of the design obvious and is what interviewers listen for.",
      "The dentry cache is why path resolution is not a performance problem; without it every open would be several reads.",
      "Prefer the *at family and file descriptors over repeated path lookups to eliminate time-of-check-to-time-of-use races."
    ],
    memoryAids: [
      "The inode knows everything except its own name.",
      "rm removes a name, not a file. The file goes when the last name and the last descriptor do.",
      "Write temp, fsync file, rename, fsync directory - four steps, and people forget the fourth."
    ],
    interviewPatterns: [
      "Conceptual: 'what is the difference between a hard link and a symbolic link' - identity versus a stored path, plus the crossing-filesystems limits.",
      "Practical: 'how do you update a file safely' - the rename idiom with both fsyncs.",
      "Frequency and companies: Tier 1 for systems and infrastructure roles; Tier 2 for backend, usually as a durability or debugging question."
    ],
    practiceProblems: [
      "Why can't you hard link a directory? Answer: Because directory hard links would let the filesystem tree contain cycles, and the space-reclamation scheme is reference counting, which cannot free a cycle - a directory linked into its own subtree would keep its own link count positive forever. Cycles also break the assumption that walking upward through .. terminates, which fsck, find, and recursive deletion all rely on. The exceptions the filesystem creates itself are . and .., which are cycles but are known and special-cased. Symbolic links to directories are permitted precisely because they are resolved at use time and carry no reference count.",
      "Two processes both write a large file and rename it over the same target. What can go wrong? Answer: Nothing at the level of file integrity - each rename is atomic, so the target is always one complete file, and the loser's inode is unlinked but remains readable by anyone holding it open. What can go wrong is a lost update: if both processes read the target, modified it, and wrote back, one set of changes disappears silently. Rename gives atomicity, not mutual exclusion, so you still need a lock - typically an flock on a separate lock file, or O_EXCL creation of the temporary name to serialise writers.",
      "How would you structure storage for 10 million small files? Answer: Avoid a flat directory. Shard by a hash prefix into a two- or three-level tree, as Git does with its objects directory and as many caches do, keeping each leaf directory in the low thousands of entries so lookups, listings, and backups stay fast. Consider whether a filesystem is the right store at all: 10 million files means 10 million inodes, which consumes significant metadata space and makes fsck and backup extremely slow. Packing many small objects into larger container files with an index - which is what Git packfiles, Haystack, and log-structured object stores do - is usually better."
    ],
    faq: [
      {
        question: "What exactly happens when you delete a file?",
        answer:
          "unlink removes the directory entry mapping a name to an inode and decrements that inode's link count; it does not touch the data at all. If the link count is still positive because other hard links exist, nothing further happens and the file remains fully accessible under its other names. If the count reaches zero, the kernel checks whether any process still has the file open, because an open file descriptor holds an independent reference; if there are open descriptors, the inode and all its blocks are retained and the file continues to work normally for those processes, even though it now has no name and cannot be opened again. Only when both the link count and the open reference count reach zero does the filesystem free the inode and return its data blocks to the allocator. This design has several practical consequences worth naming. It is why deleting a large log file that a daemon still has open does not reclaim any space, producing the classic df-versus-du discrepancy diagnosed with lsof +L1. It is why the standard idiom for a secure temporary file is to create it, immediately unlink it, and keep using the descriptor, since the file is then guaranteed to disappear when the process exits however it exits. And it is why deletion does not erase data - the blocks are simply marked free, so recovery tools can often retrieve them, which is why secure deletion requires overwriting or full-disk encryption rather than rm."
      },
      {
        question: "Why is rename atomic and how far does that guarantee actually go?",
        answer:
          "Rename within a single filesystem is atomic because it is a metadata operation on directory entries that the filesystem performs as a single transaction: either the entry is updated or it is not, and no observer can see an intermediate state where the name refers to a partially written file or to nothing at all. If the destination name already exists, the unlink of the old target is part of the same atomic step, so there is never a window where the name is missing. That guarantee is what makes the write-temp-then-rename idiom the standard way to update a file safely, and it holds against concurrent readers unconditionally. Where people overreach is durability across a crash, which atomicity alone does not give. Rename orders the visibility of the new contents but says nothing about whether either the contents or the rename itself have reached stable storage, so a power loss can leave the old file, the new file, or - if the data was not fsynced first - the new name pointing at a file whose blocks were allocated but never written, which historically produced zero-length configuration files after crashes. The complete idiom is therefore four steps: write the temporary file, fsync it so the data is durable, rename, and fsync the containing directory so the rename itself is durable. It is also worth knowing the boundaries: rename across filesystems is not a rename at all but a copy and delete, which is neither atomic nor cheap, and Linux's renameat2 adds RENAME_NOREPLACE to fail rather than overwrite and RENAME_EXCHANGE to swap two names atomically, which is useful for zero-downtime switchovers."
      },
      {
        question: "How do filesystems map file offsets to disk blocks efficiently?",
        answer:
          "There are two dominant designs and the shift between them is one of the clearer improvements in filesystem history. The traditional Unix scheme stores a small number of direct block pointers in the inode - twelve in ext2 and ext3 - followed by a single indirect pointer to a block full of pointers, a double indirect pointer to a block of blocks of pointers, and a triple indirect. This makes small files very cheap, since a file under about 48 KB needs no indirection at all, and it supports enormous files, but the cost grows with size: a large file needs an indirection read per region, and a one-gigabyte file requires roughly a megabyte of pointer blocks that must themselves be read and cached. The modern scheme is extents, used by ext4, XFS, btrfs, and NTFS, which record a contiguous run as a starting block and a length rather than enumerating every block. A one-gigabyte file written sequentially onto a healthy filesystem might be described by a handful of extents, so the metadata is tiny, the lookup is a short search rather than a chain of reads, and sequential I/O can be issued as very large requests. Extents depend on the allocator producing contiguity, which is why delayed allocation matters: by deferring block assignment until writeback, the filesystem knows the eventual size and can place the whole file contiguously rather than growing it block by block. When contiguity fails - a file extended repeatedly over a long period on a full filesystem - extents degenerate toward per-block records and fragmentation returns, which is what filefrag reports and what tools like xfs_fsr defragment."
      },
      {
        question: "What is the dentry cache and why does it matter so much?",
        answer:
          "The dentry cache, or directory entry cache, holds the results of path component lookups, mapping a parent directory plus a name to the corresponding inode, and it exists because path resolution is otherwise extraordinarily expensive. Opening a file five directories deep requires reading and searching five directories plus checking permissions on each, and without caching every open, stat, and access call would pay that cost in disk I/O. With a warm dentry cache the same resolution is a few hash lookups and no I/O at all, which is why the cache is typically one of the largest slab caches on a busy system and why the first access to a large tree is dramatically slower than subsequent ones. It also caches negative entries - the knowledge that a name does not exist - which matters enormously for workloads that probe many nonexistent paths, such as a language runtime searching a long list of directories for a module, or a compiler searching include paths. The cache interacts with several other things worth mentioning. It is reclaimable, so it shrinks under memory pressure, and vm.vfs_cache_pressure controls how eagerly relative to the page cache; setting it lower keeps metadata cached longer, which helps metadata-heavy workloads. It must be invalidated correctly when files change, which is a source of complexity for network filesystems where another client may have changed something. And on containerised systems, the cache is shared across the host but entries are namespace-aware, since the same path may resolve differently in different mount namespaces."
      },
      {
        question: "Why do systems avoid putting millions of files in one directory?",
        answer:
          "Several costs compound, and only one of them is the directory lookup itself. Lookup within a directory depends on the filesystem: an old ext2-style linear directory scans entries, so it is O(n) and genuinely catastrophic at scale, whereas ext4's htree hashing and XFS or btrfs B-trees make an individual lookup fast. But even with fast lookup, several other operations remain proportional to the entry count. Listing the directory must read all of it, and any listing that shows details or types calls stat on each entry, which is a separate inode read scattered across the disk - which is why ls -l on a huge directory is orders of magnitude slower than a bare readdir. Creating and deleting entries in a very large directory dirties large metadata structures and can require rehashing or rebalancing. The directory itself grows to a size that no longer fits comfortably in cache, so lookups start missing. Backup, replication, and fsck all become dramatically slower because they must traverse everything. And some filesystems have hard limits, such as ext4's historical 64,000 subdirectory cap without the dir_nlink feature. The standard remedy is hash sharding into a shallow tree, keeping each leaf in the low thousands - Git's objects directory splitting on the first two hex characters is the canonical example, and web caches, mail stores, and CDNs all do the same. Beyond a certain scale the better answer is to stop using the filesystem as a key-value store and pack objects into container files with an index, which is what Git packfiles, Facebook's Haystack, and modern object stores do."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Arpaci-Dusseau - Operating Systems: Three Easy Pieces, chapters 39-40 (Files and Directories, File System Implementation)",
        insight: "Builds a complete filesystem from inodes and bitmaps upward, which makes the name-versus-inode separation impossible to forget."
      },
      {
        source: "book",
        attribution: "Kerrisk - The Linux Programming Interface, chapters 14-18",
        insight: "The definitive account of links, path resolution, and the *at family, including the TOCTOU races that motivate them."
      },
      {
        source: "blog",
        attribution: "Dan Luu - Files are hard",
        insight: "Catalogues the many ways real programs get durable file updates wrong, which is why the four-step rename idiom is worth memorising exactly."
      }
    ]
  },
  {
    id: "topic-os-journaling-and-crash-consistency",
    moduleId: "mod-os-file-systems-and-storage",
    title: "Journaling and Crash Consistency",
    intuition:
      "A single logical filesystem operation touches several independent structures - a bitmap, an inode, a directory entry, a data block - and a crash between any two of them leaves the filesystem inconsistent. The old answer was to scan the entire filesystem afterwards and repair it, which takes hours on a large volume and cannot always recover the right answer. Journaling replaces that with write-ahead logging: record the intent atomically before touching the real structures, so recovery is replaying a small log rather than examining everything. Every crash-consistency mechanism since - soft updates, copy-on-write, log-structured design - is an alternative answer to the same question.",
    complexity: {
      time:
        "Recovery with a journal is proportional to journal size, typically seconds regardless of filesystem size; fsck without one is proportional to the number of inodes and can take hours on a multi-terabyte volume. Journaling costs extra writes at runtime: metadata journaling roughly doubles metadata writes, and full data journaling doubles all writes.",
      space:
        "A journal is a small fixed region, commonly 128 MB in ext4 regardless of filesystem size, reused circularly. Copy-on-write filesystems instead consume space proportional to the churn between checkpoints, since old blocks remain live until no snapshot references them."
    },
    lesson: [
      {
        title: "Why a Crash Corrupts a Filesystem",
        content:
          "Appending a block to a file requires at least three separate updates: mark the block used in the allocation bitmap, add the block to the inode's map and update its size, and write the data itself. These land on different parts of the disk, and the device may reorder them, so a crash can leave any subset applied. If the bitmap is written but the inode is not, the block is leaked - allocated to nobody, recoverable only by a full scan. If the inode is written but the bitmap is not, the block is free according to the allocator and in use according to the file, so a future allocation will hand it to a second file and the two will corrupt each other, which is far worse than leaking. If metadata is written but data is not, the file points at whatever bytes previously occupied that block, which may be another user's deleted data - a security problem, not merely a correctness one. Creating a file, deleting one, and renaming across directories each have their own multi-structure update with the same hazard. The classical repair, fsck, reconstructs consistency by scanning every inode and rebuilding the bitmaps, which is correct but takes time proportional to filesystem size and cannot recover intent - it can only make the structures self-consistent, not right.",
        diagram: asciiDiagram(`One logical operation, three physical writes, eight outcomes

  "append a block to file X" requires:
     (A) bitmap: mark block 8000 as USED
     (B) inode:  add block 8000, size += 4096
     (C) data:   write the 4096 bytes

  A crash can leave ANY subset applied:
  ┌─────┬─────┬─────┬──────────────────────────────────────────┐
  │  A  │  B  │  C  │ resulting state                          │
  ├─────┼─────┼─────┼──────────────────────────────────────────┤
  │  -  │  -  │  -  │ nothing happened. FINE.                  │
  │  ✓  │  -  │  -  │ LEAKED block - allocated to nobody       │
  │  -  │  ✓  │  -  │ ▲▲ WORST: inode claims a block the       │
  │     │     │     │    bitmap says is FREE ──▶ it will be    │
  │     │     │     │    handed to ANOTHER file ──▶ two files  │
  │     │     │     │    corrupting each other                 │
  │  -  │  -  │  ✓  │ orphan data, harmless                    │
  │  ✓  │  ✓  │  -  │ file points at STALE bytes ──▶ possible  │
  │     │     │     │    disclosure of deleted data (SECURITY) │
  │  ✓  │  -  │  ✓  │ leaked block with data                   │
  │  -  │  ✓  │  ✓  │ same double-allocation hazard as above   │
  │  ✓  │  ✓  │  ✓  │ complete. FINE.                          │
  └─────┴─────┴─────┴──────────────────────────────────────────┘

  ▶ And the DEVICE may reorder writes, so you cannot even rely
    on the order you issued them in without barriers/FUA.

  THE OLD ANSWER: fsck
    scan EVERY inode, rebuild the bitmaps, reattach orphans
    into lost+found.
    ┌────────────────────────────────────────────────────────┐
    │ time ∝ number of inodes, NOT amount of damage          │
    │ 10 TB volume ──▶ HOURS of downtime after every crash   │
    │ and it restores CONSISTENCY, not CORRECTNESS - it      │
    │ cannot know what you intended.                         │
    └────────────────────────────────────────────────────────┘

  THE JOURNALING ANSWER
    write the INTENT to a log first, atomically.
    recovery = replay the log. Time ∝ JOURNAL size (seconds).`)
      },
      {
        title: "Write-Ahead Logging and the Three ext4 Modes",
        content:
          "Journaling applies write-ahead logging to the filesystem. Before modifying any real structure, the filesystem writes a description of the whole update to a dedicated log region, followed by a commit record; only once the commit record is durable does it begin writing the actual structures, a phase called checkpointing. After a crash, recovery scans the journal: transactions with a valid commit record are replayed, since their effects may or may not have reached their final locations and replaying is idempotent, and transactions without one are discarded, since none of their effects were allowed to start. The commit record is what makes the multi-block update atomic - it is a single small write whose presence or absence decides everything, and its integrity is protected by a checksum so a torn write is detected. ext4 offers three modes with very different trade-offs. Journal mode logs both data and metadata, giving the strongest guarantee at the cost of writing everything twice. Ordered mode, the default, journals only metadata but forces the data blocks to disk before the metadata that references them commits, which prevents a file from ever pointing at stale blocks. Writeback mode journals metadata with no ordering constraint on data, which is fastest and permits exactly the stale-data exposure that ordered mode prevents.",
        codeExample: `# ext4 journaling modes - the trade-off, concretely.

mount -o data=ordered   /dev/sda1 /mnt   # DEFAULT
mount -o data=journal   /dev/sda1 /mnt
mount -o data=writeback /dev/sda1 /mnt

# ┌────────────┬──────────┬──────────┬───────────────────────┐
# │ mode       │ metadata │ data     │ after a crash         │
# ├────────────┼──────────┼──────────┼───────────────────────┤
# │ journal    │ journaled│ JOURNALED│ strongest. Both are   │
# │            │          │          │ written TWICE ──▶ ~2x │
# │            │          │          │ write amplification   │
# ├────────────┼──────────┼──────────┼───────────────────────┤
# │ ordered    │ journaled│ ordered  │ metadata never points │
# │ (default)  │          │ BEFORE   │ at stale blocks.      │
# │            │          │ commit   │ Good default.         │
# ├────────────┼──────────┼──────────┼───────────────────────┤
# │ writeback  │ journaled│ unordered│ FASTEST. A file can   │
# │            │          │          │ contain another       │
# │            │          │          │ user's deleted data.  │
# └────────────┴──────────┴──────────┴───────────────────────┘

# Transaction lifecycle in the journal (JBD2):
#   1. reserve space, gather all blocks of the operation
#   2. write DESCRIPTOR + the modified metadata blocks to the log
#   3. write the COMMIT record  ◀── the atomic decision point
#      (checksummed, so a torn commit is detected and discarded)
#   4. later: CHECKPOINT - write the blocks to their real homes
#   5. free that journal space for reuse (it is circular)

# RECOVERY after a crash:
#   scan the journal ──▶ for each transaction
#      has a valid COMMIT?  ──▶ REPLAY it (idempotent)
#      no valid COMMIT?     ──▶ DISCARD it
#   time ∝ journal size (128 MB) ──▶ seconds, on ANY volume size

# Inspect and tune:
dumpe2fs -h /dev/sda1 | grep -i journal
tune2fs -O ^has_journal /dev/sda1      # remove journal (do not)
tune2fs -J size=256 /dev/sda1          # bigger journal

# THE BARRIER QUESTION - journaling assumes ordering it must enforce
mount -o barrier=1 ...    # DEFAULT: flush device cache at commit
mount -o nobarrier ...    # FASTER and UNSAFE on volatile cache
#   Without barriers the DEVICE may reorder the commit record
#   ahead of the data it commits ──▶ the entire scheme breaks.
#   Only safe with a battery-backed or flush-safe cache.`
      },
      {
        title: "Copy-on-Write and Log-Structured Alternatives",
        content:
          "Journaling writes everything twice, which is a real cost, and two families of design avoid it by never overwriting data in place. Copy-on-write filesystems - ZFS, btrfs, APFS - write modified blocks to new locations and then update the parent pointers, which are themselves written to new locations, propagating up to a single root block. Switching the root atomically publishes the entire set of changes, so a crash simply leaves the previous root valid and the partial new state unreferenced; there is nothing to replay and nothing to repair. The same mechanism gives snapshots almost free, since retaining an old root retains a complete consistent view of the past, and it composes naturally with block checksums, which is why these filesystems can detect and, with redundancy, repair silent corruption. The costs are fragmentation, because updates scatter, and space amplification, because old blocks stay live while any snapshot references them. Log-structured filesystems take the idea further by writing everything sequentially to a log and relying on a cleaner to reclaim space, which suits devices where sequential writes are much cheaper than random ones - which is exactly the situation on flash, and is why the same structure reappears inside SSD firmware and in LSM-tree databases like RocksDB.",
        diagram: asciiDiagram(`Three answers to crash consistency

  1. JOURNALING (ext4, XFS, NTFS)
     write intent to a log, commit, then apply in place
       log:  [ desc | metadata blocks | COMMIT ]
       then: overwrite the real structures
     ┌───────────────────────────────────────────────────┐
     │ + small fixed log, fast recovery, mature          │
     │ - writes metadata TWICE (data twice in data=journal)│
     │ - still overwrites in place ──▶ torn writes matter │
     └───────────────────────────────────────────────────┘

  2. COPY-ON-WRITE (ZFS, btrfs, APFS)
     never overwrite; write new blocks, then swing the root

        OLD tree                    NEW tree
        root ──┬──▶ A               root' ──┬──▶ A   (shared)
               ├──▶ B                       ├──▶ B'  (new copy)
               └──▶ C                       └──▶ C   (shared)
                          ▲
        atomically switch root ──▶ root'
        crash before the switch ──▶ OLD tree intact, new blocks
                                     are simply unreferenced
     ┌───────────────────────────────────────────────────┐
     │ + no double write, snapshots nearly free,         │
     │   composes with block CHECKSUMS ──▶ detect and    │
     │   repair silent corruption                        │
     │ - FRAGMENTATION (updates scatter)                 │
     │ - space held by snapshots; "df lies" on ZFS/btrfs │
     └───────────────────────────────────────────────────┘

  3. LOG-STRUCTURED (LFS, F2FS, and every SSD's FTL, and LSM
     trees like RocksDB)
     write EVERYTHING sequentially; a CLEANER reclaims space
       ████████████████░░░░░░░░──▶ append point
       ▲ live and dead blocks interleaved; cleaner compacts
     ┌───────────────────────────────────────────────────┐
     │ + turns ALL writes into sequential writes         │
     │   ──▶ ideal for flash, where random writes are    │
     │       expensive and erase blocks are large        │
     │ - the CLEANER competes with foreground work       │
     │   ──▶ write amplification and latency spikes      │
     └───────────────────────────────────────────────────┘

  ▶ The same three ideas recur one layer down inside SSDs and
    one layer up inside databases. It is one design space.`)
      }
    ],
    examples: [
      {
        title: "A four-hour fsck after an unclean shutdown",
        input: "A 20 TB ext2 volume is powered off abruptly.",
        output: "Repair time is proportional to inode count, not to damage.",
        explanation:
          "Step 1: Without a journal there is no record of what was in flight, so consistency must be reconstructed from the structures themselves.\nStep 2: fsck reads every inode, rebuilds the block and inode bitmaps, and reattaches unreferenced inodes to lost+found.\nStep 3: The scan is dominated by random metadata reads across the whole volume, so it scales with size regardless of how little was actually in progress.\nStep 4: A journal reduces this to replaying a 128 MB log - seconds - because recovery only needs to consider transactions that were open at the moment of the crash."
      },
      {
        title: "A file containing another user's deleted data after a crash",
        input: "A filesystem mounted with data=writeback is power-cycled during an append.",
        output: "Metadata committed before the data blocks were written.",
        explanation:
          "Step 1: In writeback mode only metadata is journaled, and no ordering is imposed between data writes and the metadata that references them.\nStep 2: The inode update reached the journal and was replayed, so the file claims blocks whose contents were never written.\nStep 3: Those blocks still hold whatever a previously deleted file left there, which the new owner can now read.\nStep 4: Ordered mode, the default, forces the data blocks out before the referencing metadata commits, which eliminates this exposure at modest cost - and it is why writeback mode is rarely a good trade."
      },
      {
        title: "Disabling barriers to gain throughput and losing the filesystem",
        input: "An operator mounts with nobarrier on a consumer SSD with a volatile write cache.",
        output: "The device reorders the commit record ahead of the data it commits.",
        explanation:
          "Step 1: Journaling depends on the commit record becoming durable only after the blocks it describes.\nStep 2: Barriers implement that by flushing the device cache before writing the commit record.\nStep 3: With barriers disabled the device is free to reorder, so a crash can leave a valid commit for a transaction whose blocks never landed, and replay then writes garbage confidently.\nStep 4: nobarrier is only safe when the cache is battery-backed or the device honours flush semantics inherently; on consumer hardware it converts a robust filesystem into a fragile one for a modest throughput gain."
      }
    ],
    tips: [
      "Frame journaling as write-ahead logging applied to a filesystem; the parallel with databases makes the mechanism instantly clear.",
      "Explain why the commit record is the atomicity point - it is one small write whose presence decides the fate of a large update.",
      "Name the ordered-versus-writeback distinction concretely, using the stale-data exposure rather than an abstract safety claim."
    ],
    tricks: [
      "The worst crash outcome is not a leaked block but a double-allocated one, because leaking wastes space while double allocation corrupts two files.",
      "Recovery time under journaling is proportional to journal size rather than filesystem size, which is the entire operational argument for it.",
      "Copy-on-write gets snapshots and checksums almost for free, which is why it wins on data-integrity grounds even where journaling is faster."
    ],
    memoryAids: [
      "Write the intent, commit the intent, then do the work - and on recovery, replay committed and discard the rest.",
      "fsck time scales with the disk; journal replay scales with the log.",
      "Copy-on-write never overwrites, so a crash just leaves the old root standing."
    ],
    interviewPatterns: [
      "Mechanism: 'how does a filesystem survive a crash mid-write' - multi-structure update, then write-ahead logging.",
      "Trade-off: 'journaling versus copy-on-write' - double writes against fragmentation and snapshot capability.",
      "Frequency and companies: Tier 1 for storage, database, and infrastructure roles; Tier 2 elsewhere as a durability question."
    ],
    practiceProblems: [
      "Why does journaling metadata but not data still leave a correctness problem, and how does ordered mode fix it? Answer: If only metadata is journaled and no ordering is imposed, an inode update naming new blocks can become durable before those blocks are written, so after recovery the file references blocks containing stale contents - potentially another user's deleted data. Ordered mode fixes it by forcing the data blocks to reach storage before the transaction that references them commits, so metadata never points at unwritten blocks. It gives the security and correctness property of full data journaling without writing data twice, which is why it is the default.",
      "Why is journal replay idempotent, and why does that matter? Answer: Replay rewrites blocks to their final locations with the exact contents recorded in the journal, so applying it once or five times produces the same state. That matters because recovery itself can crash - a machine can lose power while replaying - and the next recovery must be able to start over safely. It also means the filesystem need not track how far checkpointing had progressed before the crash; it simply replays every committed transaction in the journal. Non-idempotent operations, such as incrementing a counter, could not be logged this way, which is why journals record resulting block images rather than deltas.",
      "A copy-on-write filesystem reports the disk full but du shows far less data. Explain. Answer: Snapshots. In a copy-on-write design, blocks are never overwritten, so a modified block is written elsewhere and the original remains live as long as any snapshot references it. du walks the current tree and sees only currently referenced data, while the allocator accounts for everything any snapshot holds. A workload that rewrites a large file repeatedly while snapshots exist can consume many times the file's apparent size. The fix is snapshot lifecycle management - expiring old snapshots - and the diagnostic is the filesystem's own space accounting, such as zfs list -o space or btrfs filesystem usage, rather than df."
    ],
    faq: [
      {
        question: "What is write-ahead logging and why does it guarantee atomicity?",
        answer:
          "Write-ahead logging is the rule that a description of a change must be durably recorded before the change itself is applied to its permanent location. The reason it produces atomicity for a multi-block update is that it reduces the all-or-nothing decision to a single small write: the commit record. A transaction's blocks are written to the log first, in any order and over any period, and none of them are allowed to be applied to their real locations yet; then the commit record is written, and only after it is durable does the filesystem begin checkpointing the blocks into place. On recovery, the log is scanned and each transaction is judged by whether its commit record is present and its checksum valid. If it is, the transaction is replayed, which is safe because replay is idempotent - it writes exact block images - and necessary because checkpointing may have been interrupted partway. If it is not, the transaction is discarded, which is safe because no part of it was permitted to touch a real structure. So a crash at any instant leaves the filesystem in a state that recovery can resolve into either the complete old state or the complete new one. The scheme is exactly the one databases use for the same reason, which is a useful thing to say aloud in an interview; and its critical dependency, worth naming, is that the storage device must actually honour the ordering between the log writes and the commit record, which is what write barriers and cache flushes enforce and what nobarrier disables."
      },
      {
        question: "How does copy-on-write achieve consistency without a journal?",
        answer:
          "By never modifying anything in place, so there is no intermediate state to be caught in. When a block changes, the filesystem writes a new copy at a fresh location rather than overwriting the original. But the parent block that pointed at it must now be updated, and updating in place would reintroduce the problem, so the parent is also copied to a new location with the new pointer, and its parent likewise, propagating all the way to the root of the tree. At that point the entire updated structure exists on disk, fully written and fully unreferenced, alongside the entirely intact old structure. Publishing the change is a single atomic write of the new root - typically an uberblock or superblock written to one of several rotating slots with a checksum and a transaction number. A crash before that write leaves the old root current and every new block simply unreferenced, to be reclaimed as free; a crash after it leaves the new tree fully valid. There is nothing to replay, no fsck, and no window of inconsistency at any point. Two large benefits follow almost for free. Snapshots are simply retained old roots, since an old root still describes a complete consistent tree and its blocks are protected from reuse by reference counting - so a snapshot costs nothing but the blocks that subsequently diverge. And because every pointer is written together with a checksum of the block it points to, the tree is self-validating, so silent corruption is detected on read and, with redundancy, repaired. The costs are fragmentation, because logically sequential data scatters as it is updated, and space held by snapshots, which is why df is misleading on ZFS and btrfs."
      },
      {
        question: "Why do write barriers matter and what happens without them?",
        answer:
          "Because every crash-consistency scheme depends on ordering that the storage stack does not otherwise guarantee. Drives contain volatile write caches and reorder requests freely to optimise throughput, and the kernel's own I/O scheduler reorders as well, so the sequence in which the filesystem issues writes bears no reliable relation to the order in which they become durable. A journal's entire correctness argument rests on the commit record becoming durable strictly after the blocks it commits; if the device happens to write the commit record first and then loses power, recovery finds a valid commit for a transaction whose data never landed, and it will confidently replay garbage into the filesystem - which is worse than no journal at all, because the corruption is applied deliberately. A write barrier, implemented as a cache flush or as a FUA write, is the mechanism that enforces the ordering: it tells the device to make everything issued so far durable before proceeding. The cost is real, since a flush can take milliseconds and drains the device's pipeline, so barriers reduce throughput on metadata-heavy workloads, and this is why nobarrier exists as a mount option and why it is regularly and dangerously recommended in performance tuning guides. It is only legitimate when the write cache is non-volatile - a RAID controller with a battery-backed or flash-backed cache, or an enterprise SSD with power-loss protection capacitors - because then the cache's contents survive power loss and the ordering guarantee holds without the flush. On consumer hardware, disabling barriers trades a modest throughput gain for a filesystem that can be silently destroyed by a single power event."
      },
      {
        question: "What is fsync actually doing and why is it so expensive?",
        answer:
          "fsync forces all previously written data for a file, plus the metadata needed to retrieve it, out of the page cache and onto stable storage, and it does not return until the device confirms. That involves several steps, each of which can be slow. The dirty pages of the file must be written, which is I/O proportional to how much has been modified. The filesystem must ensure the metadata describing those blocks is durable too, which in a journaling filesystem means committing a journal transaction - and a journal commit involves a cache flush before the commit record and often another after. Then the device's write cache must be flushed, which is a synchronous operation that drains the device's internal pipeline and, on some hardware, takes milliseconds. Worse, these costs are not private: a journal commit is shared, so an fsync can end up committing other processes' metadata too, and the device flush waits behind whatever is already queued - which is why a tiny fsync on an idle-looking database can take seconds if another process has filled the cache with dirty pages, the classic incident pattern. Several refinements exist. fdatasync skips metadata that is not needed to read the data back, such as the modification timestamp, avoiding a journal commit in the common case of overwriting within an existing file, and it is meaningfully cheaper. sync_file_range gives finer control over which ranges are written, though it does not flush the device cache and so is not a durability primitive on its own. And O_DIRECT bypasses the page cache entirely, letting the application manage its own buffering, which is why databases use it in combination with their own write-ahead log."
      },
      {
        question: "How do modern filesystems detect silent data corruption?",
        answer:
          "By checksumming, and the crucial design decision is where the checksum is stored. Storing a block's checksum inside the block itself catches media errors but not misdirected writes - if the device writes a block to the wrong location, both the data and its checksum are self-consistent and the error is invisible. ZFS and btrfs therefore store each block's checksum in its parent pointer, so validation checks not only that the block is internally intact but that it is the block the parent expected, which detects misdirected writes, phantom writes where the device acknowledged without writing, and bit rot alike. Because the tree is copy-on-write, updating a block updates its parent anyway, so the checksum costs nothing extra structurally. Detection alone only converts silent corruption into a loud read error, which is already a large improvement; repair requires redundancy, and with a mirror or RAID-Z the filesystem reads the alternative copy, validates it against the same checksum, returns the good data, and rewrites the bad copy - self-healing that a traditional RAID layer cannot do because it has no way to tell which of two differing copies is correct. Scrubbing extends this to a background pass that reads and validates everything periodically, catching corruption before the redundancy needed to repair it is lost to a second failure. ext4 has adopted a narrower version, checksumming metadata and journal contents but not file data, which protects the filesystem's own structures without the copy-on-write foundation needed to do the same for data. The broader lesson worth stating is that storage devices do fail silently at rates that matter at scale, so end-to-end verification at the layer that knows what the data should be is the only reliable defence."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Prabhakaran et al. - Analysis and Evolution of Journaling File Systems (USENIX 2005)",
        insight: "Dissects the actual journaling modes and their failure behaviour empirically rather than by specification, which is where the surprises live."
      },
      {
        source: "paper",
        attribution: "Rosenblum and Ousterhout - The Design and Implementation of a Log-Structured File System (1991)",
        insight: "The origin of the log-structured idea that now reappears inside every SSD controller and every LSM-tree database."
      },
      {
        source: "paper",
        attribution: "Bonwick and Moore - ZFS: The Last Word in File Systems",
        insight: "Explains why parent-stored checksums plus copy-on-write give end-to-end integrity that no block-level RAID can provide."
      }
    ]
  },
  {
    id: "topic-os-block-allocation-and-layout",
    moduleId: "mod-os-file-systems-and-storage",
    title: "Block Allocation, Extents, and Fragmentation",
    intuition:
      "A filesystem is an allocator whose failure mode is measured in milliseconds rather than bytes. Where blocks are placed determines whether reading a file is one large sequential request or ten thousand scattered ones, and on rotating media that is a difference of two orders of magnitude. The techniques - block groups, delayed allocation, extents, preallocation - all serve one goal: keep logically adjacent data physically adjacent, and keep metadata near the data it describes. Flash changes the constants dramatically but not the principle, because even on SSDs large sequential requests beat many small random ones.",
    complexity: {
      time:
        "Sequential read of a contiguous file approaches device bandwidth: gigabytes per second on NVMe, 150 to 250 MB/s on rotating media. A badly fragmented file degrades to per-request latency: an 8 ms seek per fragment on a disk, or roughly 80 microseconds per request on NVMe. Allocation itself is fast - a bitmap or B-tree search - but delayed allocation defers it to writeback where more information is available.",
      space:
        "Block size sets the internal fragmentation floor: with 4 KB blocks, a 1-byte file consumes 4 KB, so a million tiny files waste gigabytes. ext4 reserves 5 percent of the filesystem by default, partly for root and partly to give the allocator room to find contiguous space, which is why a filesystem above about 90 percent full fragments badly."
    },
    lesson: [
      {
        title: "Locality by Construction: Block Groups and Cylinder Groups",
        content:
          "The Berkeley Fast File System established the principle that still governs allocation: place related things near each other, and give the allocator enough structure to do so without global search. The disk is divided into groups - cylinder groups originally, block groups in ext4 - each containing its own inode table, block bitmap, inode bitmap, and data blocks. A new file's inode is placed in the same group as its parent directory, and its data blocks are placed in the same group as its inode, so opening a file and reading it touches a narrow region rather than the whole device. A new directory, by contrast, is deliberately placed in a group with plenty of free space and few directories, spreading the tree so that groups do not all fill at once. Very large files are broken across groups on purpose, because filling one group entirely would leave no room for the small files that belong there. The result is that locality is a property of the layout rather than of luck, and it is why the original FFS achieved roughly a tenfold improvement over the naive Unix filesystem it replaced. The same reasoning appears at every level - it is why databases cluster indexes and why object stores pack small objects together.",
        diagram: asciiDiagram(`Block groups: locality by construction

  ┌───────────────────────────────────────────────────────────┐
  │ superblock │ group 0 │ group 1 │ group 2 │ ... │ group N  │
  └───────────────────────────────────────────────────────────┘

  each group is a self-contained mini-filesystem:
  ┌──────────────────────────────────────────────────────────┐
  │ sb copy │ group desc │ block bmap │ inode bmap │         │
  │ inode table │████ data blocks ████████████████████████   │
  └──────────────────────────────────────────────────────────┘
      ▲              ▲                    ▲
      metadata is IN the group, next to the data it describes
      ──▶ reading a file touches ONE region, not the whole disk

  PLACEMENT RULES (the whole trick)
    new FILE      ──▶ same group as its PARENT DIRECTORY
    its DATA      ──▶ same group as its inode
    new DIRECTORY ──▶ a group with MANY free blocks and FEW
                      directories  ◀── deliberately SPREAD OUT
    huge FILE     ──▶ deliberately SPLIT across groups, so it
                      does not consume a whole group and starve
                      the small files that belong there

  WHY SPREAD DIRECTORIES BUT CLUSTER FILES?
    clustering files near their directory ──▶ fast open+read
    spreading directories                 ──▶ prevents every
                                              group filling at
                                              once, preserving
                                              contiguity everywhere

  ▶ FFS got ~10x over naive Unix FS from layout ALONE.
    Same idea recurs as clustered indexes in databases and as
    packfiles in object stores.

  THE FULLNESS CLIFF
    free space ████████████░░░░  30% free ──▶ allocator finds
                                              contiguous runs
    free space ██████████████▓░  3% free  ──▶ only scattered
                                              holes remain
    ┌──────────────────────────────────────────────────────┐
    │ Above ~90% full, fragmentation rises sharply. The 5% │
    │ ext4 reserve is partly to keep the allocator working.│
    └──────────────────────────────────────────────────────┘`)
      },
      {
        title: "Delayed Allocation and Extents",
        content:
          "The single most effective modern allocation technique is to not allocate immediately. When a process writes, the data goes into the page cache marked dirty and no blocks are assigned; only at writeback, potentially seconds later, does the filesystem choose locations - and by then it usually knows the file's final size and has many pages to place at once, so it can allocate one large contiguous extent rather than growing block by block. This is delayed allocation, and it turns a file written in a thousand small writes into a file occupying a single run on disk. It pairs with extents, which describe a contiguous range as a start block and a length rather than enumerating every block, so a large sequential file's entire map fits in the inode. The combination means both the data and the metadata describing it are compact and sequential. The trade-off is a durability subtlety that caused a famous controversy: because allocation is deferred, a crash shortly after a rename over an existing file could leave the new name pointing at a file whose blocks were never allocated, producing zero-length files - which is why ext4 gained heuristics to force allocation on rename and truncate, and why applications should still fsync before rename rather than relying on those heuristics.",
        codeExample: `/* Allocation control from user space. */

/* PREALLOCATE - reserve contiguous space up front, no writes. */
#include <fcntl.h>
fallocate(fd, 0, 0, 10UL << 30);      /* reserve 10 GB */
/*   allocates EXTENTS without writing data. The allocator sees
     the full size at once ──▶ one big contiguous run.
     Databases and VM images do this at creation.             */

posix_fallocate(fd, 0, size);          /* portable; may fall
                                          back to writing zeros
                                          - much slower        */

/* PUNCH A HOLE - deallocate a range, making the file sparse. */
fallocate(fd, FALLOC_FL_PUNCH_HOLE | FALLOC_FL_KEEP_SIZE,
          offset, len);

/* SPARSE FILES - seek past the end and write; the gap costs
   nothing until written.                                     */
lseek(fd, 1UL << 40, SEEK_SET);        /* 1 TB */
write(fd, "x", 1);
/*   ls -l shows 1 TB.  du shows 4 KB.  ◀── apparent vs actual
     Naive copying EXPANDS holes into real zeros; use
     cp --sparse=always, or rsync -S, or SEEK_HOLE/SEEK_DATA. */

off_t data = lseek(fd, off, SEEK_DATA);  /* next data */
off_t hole = lseek(fd, off, SEEK_HOLE);  /* next hole */

/* MEASURE fragmentation */
// filefrag -v bigfile.dat
//   File size of bigfile.dat is 10737418240 (2621440 blocks)
//    ext:  logical_offset:  physical_offset: length:  flags:
//      0:        0..  2621439:  8192.. 2629631: 2621440: last,eof
//   bigfile.dat: 1 extent found        ◀── perfect
//
//   vs. a badly grown file:
//   bigfile.dat: 18422 extents found   ◀── each one a seek

// xfs_bmap -v file          # XFS equivalent
// e4defrag /path            # ext4 online defragmentation
// xfs_fsr                   # XFS reorganiser

/* DELAYED ALLOCATION - the ext4 controversy, in one comment:
     write() ──▶ page cache, NO blocks assigned yet
     writeback (seconds later) ──▶ allocate ONE big extent
   Benefit: contiguity, and short-lived temp files may never
            be allocated at all.
   Hazard:  rename() over a target could publish a file whose
            blocks were never allocated ──▶ ZERO-LENGTH file
            after a crash. ext4 added heuristics; you should
            still fsync() before rename().                    */`
      },
      {
        title: "Fragmentation on Rotating Media and on Flash",
        content:
          "On a rotating disk, fragmentation is expensive because every discontiguity costs a seek - moving the head and waiting for rotation, roughly eight milliseconds - so a file in ten thousand fragments takes eighty seconds to read where a contiguous copy takes a few. This is why defragmentation was a visible ritual of the disk era and why filesystems work so hard at contiguity. On flash there is no head to move, so a random read costs approximately the same as a sequential one and classic defragmentation is pointless and actively harmful, since it burns erase cycles. But fragmentation has not become irrelevant; it has changed form. Many small requests still cost more than few large ones because each carries per-request overhead through the block layer and the device queue, so a fragmented file is read with thousands of small I/Os rather than a handful of large ones. More importantly, the SSD contains its own log-structured filesystem in the flash translation layer, which maps logical to physical blocks, and it suffers its own write amplification and garbage collection: writing 4 KB may force the controller to relocate an entire erase block of megabytes. That is why TRIM matters - telling the device which blocks are free lets its garbage collector avoid relocating dead data - and why heavily-written SSDs slow down as their spare area fills.",
        diagram: asciiDiagram(`Fragmentation: the cost changed, the principle did not

  ROTATING DISK
    contiguous file, 1 extent
      seek once ──▶ stream 10 GB at 200 MB/s ──▶ ~50 s
      ████████████████████████████████████████
    fragmented file, 10,000 extents
      10,000 seeks x 8 ms          ──▶ ~80 s of SEEKING ALONE
      ██░░██░░░██░░░░██░░██░░░░░██░░██░░░░██░░
    ▶ defragmentation was a visible, worthwhile ritual.

  SSD
    no head, no rotation ──▶ random ≈ sequential in LATENCY
    BUT:
      ┌──────────────────────────────────────────────────┐
      │ 1. per-REQUEST cost still matters. 10,000 small  │
      │    I/Os cost far more than 40 large ones through │
      │    the block layer and the device queue.         │
      │ 2. classic defrag is HARMFUL - it burns erase    │
      │    cycles for no seek benefit.                   │
      └──────────────────────────────────────────────────┘

  INSIDE the SSD: another log-structured filesystem (the FTL)
    ┌───────────────── ERASE BLOCK (e.g. 4 MB) ───────────────┐
    │ ▓▓▓▓ live │ ░░░░ dead │ ▓▓▓▓ live │ ░░░░ dead │ ...    │
    └──────────────────────────────────────────────────────────┘
      you cannot overwrite a page - you must ERASE the whole
      block first. So:
        write 4 KB ──▶ FTL writes it elsewhere, marks old dead
        block fills ──▶ garbage collect: copy LIVE pages out,
                        erase, reuse
        ──▶ WRITE AMPLIFICATION: 4 KB written by you may cost
            megabytes of internal relocation

  TRIM / DISCARD - tell the device what is FREE
    without TRIM: the FTL relocates dead data forever, because
                  it cannot know the filesystem freed it
    with TRIM:    garbage collection skips it ──▶ less write
                  amplification, more spare area, faster writes
    mount -o discard   # inline, can be slow on some devices
    fstrim -av         # periodic batch - the usual choice
                       # (systemd runs fstrim.timer weekly)

  ▶ Overprovisioning (leaving 10-20% unpartitioned) gives the
    FTL permanent spare area and measurably improves sustained
    write performance and endurance.`)
      }
    ],
    examples: [
      {
        title: "A database file in 18,000 extents",
        input: "filefrag reports 18,422 extents on a 10 GB file that grew over months.",
        output: "Incremental growth on a nearly-full filesystem defeated contiguous allocation.",
        explanation:
          "Step 1: The file was extended in small increments, so the allocator never saw a large request and placed each increment wherever space existed.\nStep 2: As the filesystem approached full, only scattered holes remained, so each extension landed further from the last.\nStep 3: Sequential scans of the file now issue thousands of separate requests instead of a few large ones.\nStep 4: Creating the file with fallocate at its full expected size gives the allocator the whole picture at once, and e4defrag or a copy-and-rename reorganises an existing file."
      },
      {
        title: "A sparse file expanding from 4 KB to 1 TB on copy",
        input: "A sparse VM image is copied with a naive tool and fills the destination.",
        output: "Holes were materialised as real zero blocks.",
        explanation:
          "Step 1: A sparse file has ranges with no allocated blocks, which read as zeros but consume nothing.\nStep 2: A naive copy reads the file sequentially, receives zeros for the holes, and writes them as real data.\nStep 3: The destination therefore allocates every block, expanding a 4 KB file into a 1 TB one.\nStep 4: cp --sparse=always, rsync -S, or a copy loop using SEEK_HOLE and SEEK_DATA preserves sparseness; the same issue affects tar and naive backup scripts."
      },
      {
        title: "An SSD whose write throughput halves after months of use",
        input: "Sustained write performance drops from 500 MB/s to 220 MB/s with no hardware fault.",
        output: "Spare area exhausted, so garbage collection runs in the foreground.",
        explanation:
          "Step 1: The flash translation layer needs free erase blocks to absorb writes, and it maintains them by relocating live pages and erasing.\nStep 2: Without TRIM the device believes almost every block is live, so it relocates data the filesystem has already freed, inflating write amplification.\nStep 3: When spare blocks run short, garbage collection can no longer stay ahead and runs synchronously with incoming writes.\nStep 4: Enabling periodic fstrim, or leaving 10 to 20 percent of the device unpartitioned as permanent overprovisioning, restores steady-state throughput."
      }
    ],
    tips: [
      "Explain delayed allocation as buying information - the allocator decides later because later it knows the file's size.",
      "State explicitly that defragmentation is pointless on SSDs but that request count still matters; the nuance is what interviewers are testing.",
      "Mention fallocate when asked how to make a large file fast; preallocation is the single most effective practical fix."
    ],
    tricks: [
      "Filesystems fragment sharply above roughly 90 percent full, which is why the reserve exists and why capacity alerts should fire well before full.",
      "A sparse file's apparent size and actual usage differ, so ls and du disagreeing on one file usually means holes rather than a bug.",
      "The SSD contains a log-structured filesystem of its own, so write amplification and garbage collection exist below the layer you can see."
    ],
    memoryAids: [
      "Put the inode near the directory and the data near the inode - that is the whole placement policy.",
      "Delay allocation to learn the size; use extents to describe the result in one record.",
      "On disk, fragmentation costs seeks; on flash, it costs requests and erase cycles."
    ],
    interviewPatterns: [
      "Performance: 'why is reading this large file slow' - fragmentation, extent count, and how to check with filefrag.",
      "Design: 'how would you allocate space for a database file' - preallocate with fallocate, avoid incremental growth.",
      "Frequency and companies: Tier 1 for storage and database roles; Tier 2 for backend and SRE as a capacity-planning question."
    ],
    practiceProblems: [
      "Why does a filesystem reserve a percentage of its capacity? Answer: Partly so that root can still log in and operate when the filesystem is full, and partly - more importantly for performance - so the allocator always has room to find contiguous space. As free space approaches zero, the remaining holes are small and scattered, so every allocation fragments, and the degradation is sharp rather than gradual above roughly 90 percent utilisation. The reserve keeps the allocator out of that regime. The practical consequence is that capacity alerts should fire around 80 percent, not at 95 percent, because performance degrades well before space runs out.",
      "How would you copy a 1 TB sparse file efficiently? Answer: Use a tool that understands holes. cp --sparse=always, rsync with -S, or a custom loop using lseek with SEEK_HOLE and SEEK_DATA to skip unallocated ranges, so only the actually-allocated regions are read and written. On the same filesystem, copy_file_range or reflink copies - cp --reflink=auto on btrfs, XFS, or ZFS - share blocks copy-on-write and complete almost instantly with no data movement at all. The failure mode to avoid is a naive read loop, which materialises every hole as real zero blocks and expands the file to its apparent size.",
      "Should you defragment an SSD? Answer: Not in the classic sense. There are no seeks, so relocating blocks for contiguity gains nothing in latency, and the rewrite consumes erase cycles and increases wear. What does help is reducing the number of I/O requests, which is a matter of extent count rather than physical adjacency, so preallocating with fallocate at creation is the right prevention. Separately, running fstrim keeps the device informed about free blocks so its own garbage collector works efficiently, and leaving unpartitioned space as overprovisioning improves sustained write performance - both are the SSD analogue of defragmentation and neither involves moving data for locality."
    ],
    faq: [
      {
        question: "What is delayed allocation and what does it trade away?",
        answer:
          "Delayed allocation defers the decision of where a file's blocks go from the moment of the write call to the moment of writeback, keeping the data in the page cache marked dirty but unassigned in the meantime. The benefit is information: at writeback the filesystem often knows the file's final size, has many dirty pages to place together, and can therefore allocate one large contiguous extent instead of extending the file block by block as a thousand small writes arrive. It also allows short-lived files to be created, written, and deleted without ever being allocated at all, saving the I/O entirely, which matters for compiler temporaries and similar workloads. The costs are twofold. Space accounting becomes approximate, because the space is reserved logically but not yet assigned, so an application can succeed at write and then encounter ENOSPC at close or fsync when the allocation actually happens - which is surprising and requires the filesystem to reserve conservatively. More famously, it interacts badly with the rename idiom: because the data may not be allocated when the rename commits, a crash shortly afterwards can leave the new name pointing at a file with no blocks, so the file exists and is zero length. That behaviour surfaced widely when ext4 replaced ext3 and applications that had been relying on ext3's incidental ordering lost data; ext4 responded with heuristics that force allocation on rename over an existing file and on truncate. The correct application-level answer, then and now, is to fsync the temporary file before renaming it rather than relying on any filesystem's incidental behaviour."
      },
      {
        question: "What are extents and why did they replace block pointer chains?",
        answer:
          "An extent is a record describing a contiguous run of blocks as a starting physical block plus a length, so a file that occupies one million consecutive blocks is described by a single record rather than a million pointers. The traditional alternative, used by ext2 and ext3, stored twelve direct block pointers in the inode followed by single, double, and triple indirect pointers to blocks full of further pointers, so a large file's map was itself a large tree of blocks that had to be read, cached, and updated. The problems compound with size: a one-gigabyte file needs roughly a megabyte of pointer blocks, reading it requires interleaved reads of pointer blocks and data blocks, truncating it requires walking and freeing the whole tree, and every block allocation dirties a pointer block. Extents collapse all of that for the common case of reasonably contiguous files - a large sequential file's entire map often fits inside the inode, so no indirection is read at all, truncation frees whole ranges at once, and the filesystem can issue very large I/O requests because it knows the run length. The dependency is contiguity: extents only help if the allocator produces long runs, which is why extents and delayed allocation arrived together in ext4 and why extent count is the practical fragmentation metric reported by filefrag. When contiguity fails, an extent-based file degrades toward one small extent per fragment, at which point it is no better than pointers and the metadata grows again - which is exactly what an 18,000-extent file represents."
      },
      {
        question: "How do sparse files work and where do they cause trouble?",
        answer:
          "A sparse file has ranges of its logical length for which no blocks are allocated; reading those ranges returns zeros, and they consume no space. They arise naturally when a program seeks far past the end of a file and writes, and deliberately when a range is deallocated with fallocate and FALLOC_FL_PUNCH_HOLE. The uses are important: virtual machine disk images are typically created at their full logical size but allocate only what the guest has written, database files can be preallocated logically without committing storage, and core dumps of processes with large unwritten mappings stay small. The trouble is that many tools do not know about holes and treat the file as its apparent length. A naive copy reads the whole file, receives zeros for the holes, and writes them as real blocks, expanding a 4 KB file into a terabyte one - which has filled many a destination filesystem unexpectedly. Backup tools, tar archives, and network transfers have the same hazard unless they use sparse-aware modes. The tools that handle it correctly use lseek with SEEK_HOLE and SEEK_DATA, which report where the allocated and unallocated regions are, and cp --sparse=always and rsync -S do exactly this. There is also an accounting confusion worth naming: ls reports the apparent size and du reports the allocated size, so a large discrepancy on a single file usually means holes rather than a bug. And on filesystems supporting reflinks, cp --reflink shares blocks copy-on-write instead of copying at all, which is a better answer still when source and destination are on the same filesystem."
      },
      {
        question: "What is write amplification and why does it matter on SSDs?",
        answer:
          "Write amplification is the ratio between the data physically written to the flash and the data the host asked to write, and it exists because flash cannot be overwritten in place. A NAND page, typically 4 to 16 KB, can be written once after its containing erase block - often several megabytes - has been erased, so modifying 4 KB cannot simply rewrite those 4 KB. The controller's flash translation layer instead writes the new data to a fresh page elsewhere, remaps the logical address, and marks the old page dead; over time erase blocks fill with a mixture of live and dead pages, and reclaiming them requires copying the remaining live pages to a new block, erasing, and reusing - which is garbage collection, and it writes data the host never asked to write. In the worst case, a small random write can trigger the relocation of an entire erase block, giving amplification factors in the tens. This matters for two reasons: endurance, since flash cells tolerate a limited number of erase cycles and amplification consumes them faster, and performance, since once the supply of pre-erased blocks is exhausted the garbage collector must run synchronously with incoming writes and throughput collapses - the classic symptom of an SSD that was fast when new and is half as fast a year later. The countermeasures are TRIM, which tells the device which logical blocks the filesystem has freed so the collector can treat those pages as dead rather than relocating them; overprovisioning, meaning leaving a portion of the device unpartitioned so the controller always has spare blocks; and write patterns that favour large sequential writes, which is exactly why log-structured designs and LSM-tree databases suit flash so well."
      },
      {
        question: "Why does filesystem performance degrade as it fills up?",
        answer:
          "Because allocation quality depends on having choices, and a nearly-full filesystem has none. When ample free space exists, the allocator can honour its placement policies: keep a file's blocks contiguous, keep the inode near its directory, keep the data near the inode, and keep a large file in long runs. As utilisation rises, the free space that remains is increasingly a scatter of small holes left by deleted files, so a request for a large contiguous run cannot be satisfied and the file is broken into fragments wherever space exists. The degradation is not linear; it is a cliff, typically beginning around 80 to 85 percent and becoming severe above 90, because the distribution of remaining hole sizes collapses quickly once the large holes are consumed. The effects compound: fragmented files require more extents, so metadata grows and more of it must be read; more I/O requests are issued for the same data; and subsequent allocations have even less contiguous space because the fragments themselves consume the remaining runs. Copy-on-write filesystems suffer an additional version of this, since they need free space to write new copies before releasing old ones, and ZFS in particular degrades badly above about 80 percent. The operational conclusions are that capacity alerts should trigger at 80 percent rather than at 95, that reserved space exists partly to keep the allocator functional rather than merely to protect root, and that fixing a fragmented file after the fact requires either defragmentation or a copy-and-rename onto freed space - both of which need free space to work with, which is exactly what is missing."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "McKusick et al. - A Fast File System for UNIX (1984)",
        insight: "The origin of cylinder groups and placement policy, and still the clearest statement of why layout dominates filesystem performance."
      },
      {
        source: "paper",
        attribution: "Mathur et al. - The new ext4 filesystem: current status and future plans (Linux Symposium 2007)",
        insight: "Explains extents and delayed allocation together, including why they only work as a pair."
      },
      {
        source: "blog",
        attribution: "Anandtech and Intel technical notes on SSD write amplification and overprovisioning",
        insight: "Quantifies why TRIM and spare area determine sustained write performance far more than any host-side defragmentation."
      }
    ]
  },
  {
    id: "topic-os-page-cache-and-io-path",
    moduleId: "mod-os-file-systems-and-storage",
    title: "The Page Cache and the Buffered I/O Path",
    intuition:
      "Every read and write you issue against a file almost certainly does not touch the device. It touches the page cache, a region of otherwise-free memory in which the kernel keeps file contents, and only cache misses and writeback reach storage. This is why the same file read twice is a thousand times faster the second time, why free memory looks alarmingly low on a healthy Linux machine, and why a write call returning does not mean the data is safe. Understanding the buffered path - and when to bypass it - explains most of the surprising behaviour in file I/O.",
    complexity: {
      time:
        "A page cache hit costs roughly a memcpy: hundreds of nanoseconds to a few microseconds for a 4 KB page, dominated by the copy between kernel and user buffers. A miss costs a device read: about 80 to 100 microseconds on NVMe, a few hundred on SATA SSD, and 5 to 10 milliseconds on rotating media. The ratio is three to four orders of magnitude, which is why hit rate dominates file I/O performance far more than any device choice.",
      space:
        "The page cache is elastic and takes essentially all otherwise-unused memory, which is why 'free' memory on a busy Linux box is near zero while 'available' memory is large. Dirty pages are bounded by dirty_ratio and dirty_background_ratio, historically 20 and 10 percent of available memory, because unbounded dirty data means unbounded data loss on crash and unbounded writeback stalls."
    },
    lesson: [
      {
        title: "What Happens on read() and write()",
        content:
          "A buffered read looks up the requested file offset in the page cache, which is indexed per inode by page offset. On a hit, the kernel copies the page into the user buffer and returns - no device involvement at all. On a miss, it allocates a page, issues a read to the block layer, blocks the calling thread until the I/O completes, then copies and returns; it also typically triggers readahead, fetching subsequent pages speculatively because sequential access is overwhelmingly common. A buffered write is more surprising: the kernel copies the user buffer into a page in the cache, marks the page dirty, and returns. No device I/O has happened. The data lives only in volatile memory, and if the machine loses power it is gone even though write reported success. Writeback happens later, driven by kernel threads that flush dirty pages when they exceed a threshold, when they age past a deadline, or when explicitly requested by fsync. This asynchrony is what makes buffered I/O fast - writes are absorbed at memory speed and batched into large sequential device requests - and it is also the entire source of the durability confusion that dominates interview questions about file I/O.",
        diagram: asciiDiagram(`The buffered I/O path

  read(fd, buf, 4096)
    │
    ▼
  ┌──────────────────────────────────────────────┐
  │ page cache lookup: (inode, page offset)      │
  └──────────────────────────────────────────────┘
       │ HIT                        │ MISS
       ▼                            ▼
   copy page ──▶ user buf     allocate page
   return (~1 us)                   │
                                    ▼
                             submit to block layer
                                    │  ◀── thread BLOCKS
                                    ▼
                             device read (~80 us NVMe,
                                           ~8 ms disk)
                                    │
                                    ▼
                             copy ──▶ user buf, return
                             + READAHEAD next pages
                               (sequential is the common case)

  write(fd, buf, 4096)
    │
    ▼
  copy user buf ──▶ page cache page
  mark page DIRTY
  return  ◀── NO DEVICE I/O HAS HAPPENED
              data is in VOLATILE memory only
    │
    │  later, asynchronously:
    ▼
  ┌──────────────────────────────────────────────┐
  │ writeback threads flush dirty pages when     │
  │   - dirty_background_ratio exceeded (async)  │
  │   - dirty_ratio exceeded (writer THROTTLED)  │
  │   - dirty_expire_centisecs age reached       │
  │   - fsync() / sync() forces it               │
  └──────────────────────────────────────────────┘
    │
    ▼
  device write ──▶ maybe still in DEVICE cache!
                   FLUSH / FUA needed for real durability

  ▶ write() returning means "the kernel has it",
    NOT "the disk has it". Only fsync() means the latter.`)
      },
      {
        title: "Durability: fsync, Barriers, and What Actually Survives",
        content:
          "There are three places data can sit and only the last is durable: the page cache, the device's volatile write cache, and the persistent medium. The write call moves data to the first. Writeback moves it to the second. Only a cache flush command, issued by fsync or by a write with the force-unit-access flag, moves it to the third. This is why fsync is expensive - it is not merely a memory operation, it waits for the device to acknowledge that its own cache has been committed - and why disabling barriers makes benchmarks look wonderful and makes crashes destroy data. There are further subtleties that matter in practice. Calling fsync on a file does not make its directory entry durable, so a newly created file needs a second fsync on the containing directory or it can vanish while its data survives. On Linux, if writeback encounters an I/O error, the error is reported to the next fsync and then cleared, so a program that ignores an fsync error and calls it again receives success - the behaviour known as fsyncgate that led to changes in how PostgreSQL handles write failures. And fdatasync is a cheaper variant that omits metadata not required to read the data back, which is the right call for a database file whose size has not changed.",
        codeExample: `/* The durability ladder, and how to climb it correctly. */

/* 1. WRITE - data is in the page cache. Not durable. */
write(fd, buf, n);

/* 2. FSYNC - forces writeback AND a device cache flush. */
if (fsync(fd) != 0) {
    /* fsyncgate: on Linux the error is reported ONCE and
       then cleared. Retrying fsync() may return SUCCESS
       while the data is permanently lost. Treat an fsync
       failure as UNRECOVERABLE for that data - PostgreSQL
       now panics and recovers from WAL.                  */
    abort();
}

/* 3. FDATASYNC - flushes data + only the metadata needed
      to READ IT BACK (i.e. size if it changed).
      Skips mtime/atime. Cheaper; correct for a database
      file written in place.                              */
fdatasync(fd);

/* CREATING a file durably needs TWO fsyncs. */
int fd = open("data.tmp", O_CREAT | O_WRONLY, 0644);
write(fd, buf, n);
fsync(fd);                    /* the DATA is durable      */
close(fd);
rename("data.tmp", "data");   /* atomic replace           */
int dfd = open(".", O_RDONLY | O_DIRECTORY);
fsync(dfd);                   /* the NAME is durable  ◀── */
close(dfd);
/*   Skip the directory fsync and you can crash into a
     state where the data exists but no name points to it. */

/* O_SYNC / O_DSYNC - every write behaves as write+fsync.
   Simple, correct, and slow. Use when writes are rare.    */
int sfd = open("log", O_WRONLY | O_APPEND | O_DSYNC);

/* O_DIRECT - bypass the page cache entirely.              */
int dio = open("db", O_RDWR | O_DIRECT);
/*   Requirements: buffer address, file offset, and length
     must be aligned to the device logical block size.     */
void *aligned;
posix_memalign(&aligned, 4096, 4096);
/*   O_DIRECT does NOT imply durability - it still needs
     fsync() to flush the DEVICE cache. Common mistake.    */

/* CACHE CONTROL without O_DIRECT */
posix_fadvise(fd, 0, 0, POSIX_FADV_SEQUENTIAL); /* readahead up */
posix_fadvise(fd, 0, 0, POSIX_FADV_RANDOM);     /* readahead off */
posix_fadvise(fd, 0, 0, POSIX_FADV_DONTNEED);   /* drop clean
                                                   pages - the
                                                   polite way to
                                                   not pollute
                                                   the cache    */
readahead(fd, 0, 1 << 20);                      /* prefetch      */`
      },
      {
        title: "Reading the Numbers: free, Dirty Pages, and Cache Pressure",
        content:
          "A healthy Linux machine reports almost no free memory, and this alarms people constantly. The page cache expands to fill memory that nothing else wants, because unused memory is wasted memory and clean cache pages can be reclaimed instantly by simply dropping them. The number to read is available, not free: available estimates how much memory could be given to a new process, counting reclaimable cache. Dirty pages are different - they cannot be dropped, they must be written first - so the kernel bounds them with two thresholds. Below dirty_background_ratio nothing happens; above it, writeback threads flush in the background; above dirty_ratio, the writing process is throttled and blocks inside write until enough has been flushed. This produces a characteristic pathology: a program writes happily at memory speed for a few seconds, accumulating gigabytes of dirty pages, then hits the hard limit and stalls for a long time while a slow device drains them, and the latency graph shows a sawtooth. The fix is to bound the dirty set - lower thresholds, or periodic sync_file_range calls, or O_DIRECT for bulk writers - so that writeback proceeds steadily rather than in cliff-edge bursts.",
        diagram: asciiDiagram(`Memory accounting and the writeback cliff

  $ free -h
                total   used   free   shared  buff/cache  available
  Mem:           32Gi   6Gi   0.4Gi    0.2Gi        25Gi       25Gi
                              ▲                     ▲          ▲
                              │                     │          │
                    "no free memory!"      page cache    the number
                     ◀── NOT a problem     grew to fill  that MATTERS
                                           spare RAM

  ▶ CLEAN cache pages are reclaimable INSTANTLY (just drop
    them). DIRTY pages are not - they must be WRITTEN first.

  DIRTY PAGE THRESHOLDS
    dirty bytes
      │                                    ┌──── dirty_ratio (20%)
      │                                    │     WRITER THROTTLED
      │                          ░░░░░░░░░░│     - write() BLOCKS
      │                     ░░░░░           
      │           ┌─────────────────────── dirty_background_ratio
      │      ▒▒▒▒▒│                         (10%) - writeback
      │  ▒▒▒▒     │                         threads start, async
      └───────────┴────────────────────────────────▶ time

  THE SAWTOOTH PATHOLOGY
    throughput
      │████████████                ████████████
      │            ░░░░░░░░░░░░░░░░            ░░░░░
      └───────────────────────────────────────────▶ time
       fast (memory) │  STALL   │ fast │  STALL
                     ▲
       gigabytes of dirty pages hit dirty_ratio and now
       drain to a slow device while the writer waits

  FIXES
    ├── lower vm.dirty_background_ratio / dirty_ratio
    ├── sync_file_range() periodically ──▶ steady drain
    ├── O_DIRECT for bulk writers ──▶ never dirty the cache
    └── posix_fadvise(DONTNEED) after streaming a big file

  DIAGNOSING
    grep -E 'Dirty|Writeback' /proc/meminfo
    vmstat 1        # bi/bo columns, and 'wa' in CPU
    iostat -x 1     # %util, await, aqu-sz
    echo 3 > /proc/sys/vm/drop_caches   # TEST ONLY - drops
                                        # clean cache so you can
                                        # measure a cold read`)
      }
    ],
    examples: [
      {
        title: "The same query is 1000x faster the second time",
        input: "A cold scan takes 40 seconds; rerun immediately, it takes 40 milliseconds.",
        output: "The first run populated the page cache; the second never touched the device.",
        explanation:
          "Step 1: The first scan missed in the page cache, so every block was fetched from storage with device latency.\nStep 2: Those pages remained cached, since nothing evicted them.\nStep 3: The second scan hit in cache and cost only the memcpy between kernel and user buffers.\nStep 4: This is why benchmarks must either drop caches between runs or explicitly measure the warm case, and why reporting a warm number as though it were cold is a classic benchmarking error."
      },
      {
        title: "A file that exists with no name after a crash",
        input: "A program writes a temp file, fsyncs it, renames it, and the machine loses power.",
        output: "After reboot the destination name is missing even though fsync succeeded.",
        explanation:
          "Step 1: fsync on the file made its data durable.\nStep 2: The rename modified the directory, and directory changes live in the page cache like any other metadata.\nStep 3: The crash occurred before the directory's own writeback, so the new name was never persisted.\nStep 4: Opening the containing directory and calling fsync on that descriptor after the rename is what makes the name durable, which is why the durable-replace idiom has two fsyncs, not one."
      },
      {
        title: "A backup job that stalls the whole machine",
        input: "A nightly copy of a large dataset causes unrelated services to see multi-second latency.",
        output: "Dirty page accumulation hit the hard limit and throttled everything writing.",
        explanation:
          "Step 1: The copy wrote at memory speed, accumulating dirty pages far faster than the device could drain them.\nStep 2: Once dirty_ratio was reached, any process calling write was throttled, including latency-sensitive ones.\nStep 3: Meanwhile the copy's clean read pages evicted the working set that other services depended on.\nStep 4: Using O_DIRECT or periodic sync_file_range for the copy bounds its dirty set, and posix_fadvise with DONTNEED stops it from polluting the cache, restoring isolation."
      }
    ],
    tips: [
      "Answer 'does write() persist data' with a firm no and name the three tiers: page cache, device cache, medium.",
      "Always mention the directory fsync when discussing atomic file replacement; interviewers listen specifically for it.",
      "Explain that low free memory on Linux is normal and that available is the meaningful figure."
    ],
    tricks: [
      "fdatasync is materially cheaper than fsync for in-place writes because it skips metadata that is not needed to read the data back.",
      "O_DIRECT bypasses the cache but does not imply durability - it still needs a flush to reach the medium.",
      "posix_fadvise with DONTNEED lets a bulk job avoid destroying everyone else's cache without resorting to O_DIRECT."
    ],
    memoryAids: [
      "Three tiers: page cache, device cache, platter. write reaches one, writeback reaches two, fsync reaches three.",
      "Durable replace = write, fsync file, rename, fsync directory.",
      "Free memory near zero is health; available memory is the number that matters."
    ],
    interviewPatterns: [
      "Durability: 'your process wrote and returned, then the power failed - what survived' - the canonical page cache question.",
      "Performance: 'why is the second run fast' and 'why did this backup stall the box' - cache hits and dirty throttling.",
      "Frequency and companies: Tier 1 for backend, database, and infrastructure roles; appears constantly in systems design follow-ups."
    ],
    practiceProblems: [
      "Why is fsync slow, and when can you avoid it? Answer: fsync is slow because it is not a memory operation - it forces writeback of the file's dirty pages and then issues a cache flush command to the device and waits for acknowledgement that the data has reached the persistent medium. On rotating media that is a full rotation plus seek; on an SSD it is a controller-level commit. You can avoid it when durability is not required for that data, such as caches, temporary files, or data that can be regenerated. You can reduce it by batching - one fsync after many writes rather than one per write, which is exactly what group commit in a database does - and by using fdatasync when only the data matters. What you cannot do is skip it and claim durability; the write returning tells you nothing about the medium.",
      "A process writes 10 GB and the machine crashes. What is on disk? Answer: Anything up to all of it or none of it, with no ordering guarantee, unless fsync was called. Writeback flushes dirty pages when thresholds or timers fire, so an unpredictable prefix - not necessarily a prefix, in fact, since pages can be written in any order - may have reached the device. Further, data that reached the device may still be sitting in its volatile write cache and lost on power failure unless a flush was issued. The only defensible statements are that data before a successful fsync is durable and data after the last fsync is unknown. This is why databases maintain a write-ahead log and fsync it before acknowledging a transaction, rather than relying on the ordering of ordinary writes.",
      "When is O_DIRECT the right choice? Answer: When the application maintains its own cache and the page cache is pure overhead and double-buffering - which is precisely the situation for a database with its own buffer pool, since caching the same pages twice wastes memory and the kernel's eviction policy conflicts with the database's own. Also when streaming very large files that will not be reread, where filling the cache evicts other processes' useful data. The costs are significant: the buffer, offset, and length must be aligned to the device block size, there is no readahead so the application must issue its own parallelism to get throughput, and O_DIRECT still requires fsync for durability because it bypasses the page cache, not the device cache. For merely avoiding cache pollution, posix_fadvise with DONTNEED is usually the simpler and safer tool."
    ],
    faq: [
      {
        question: "What exactly is the page cache and why does it make free memory look exhausted?",
        answer:
          "The page cache is the kernel's in-memory copy of file contents, indexed by inode and page offset, and it is the thing that virtually all file I/O actually touches. When you read, the kernel checks the cache first and only issues device I/O on a miss; when you write, the kernel copies into a cache page, marks it dirty, and returns without touching the device at all. It is unified with the virtual memory system, so a memory-mapped file and a file read with read share the same physical pages, and it grows to consume essentially all memory that nothing else has claimed. That last property is what alarms people: on a busy Linux machine free reports almost no free memory, and the instinct is that something is leaking. It is not. Unused memory is wasted memory, and clean cache pages - those whose contents match the device - can be reclaimed instantly by dropping them, so they impose no cost on a process that needs memory. The figure to read is available rather than free, since available estimates how much could be handed to a new allocation, counting reclaimable cache. The genuinely constrained resource is dirty pages, which cannot be dropped because they contain the only copy of the data and must be written out first; those are bounded deliberately by the dirty ratio thresholds. So the correct mental model is that memory has three interesting categories - anonymous memory that must be swapped to reclaim, clean file pages that are free for the taking, and dirty file pages that must be written first - and that a machine with a large clean cache is a machine using its memory well."
      },
      {
        question: "Why does a write that returned successfully not mean the data is safe?",
        answer:
          "Because write does not promise durability; it promises that the kernel has taken responsibility for the data. There are three places the data can be, and only the last survives a power failure. After write returns, the data is in the page cache, which is volatile RAM - if the machine loses power the data is simply gone, even though the call reported success and the data is visible to every other process that reads the file, because they read through the same cache. Later, writeback moves the data to the device, but many devices have their own volatile write cache and acknowledge a write as soon as it lands there, so it can still be lost. Only a cache flush command, which fsync issues and waits for, guarantees the data has reached the persistent medium. This layering is deliberate and it is what makes buffered I/O fast: writes are absorbed at memory speed, batched, reordered into large sequential device requests, and short-lived files may never be written at all. But it means that any application caring about durability must call fsync and check its return value, and that the boundary between fast and safe is under the application's control rather than the kernel's. It is also why disabling write barriers or mounting with nobarrier produces spectacular benchmark numbers and catastrophic crash behaviour - the numbers are measuring how fast you can put data somewhere it will not survive."
      },
      {
        question: "What is readahead, when does it help, and when does it hurt?",
        answer:
          "Readahead is the kernel's speculation that a program reading a file sequentially will keep doing so, so it fetches pages beyond the ones requested. It matters enormously because it converts a series of small synchronous reads, each paying full device latency, into large asynchronous requests issued ahead of the application's demand, so the data is already in cache by the time it is asked for. Without readahead, sequential reading of a large file on rotating media would pay a seek and rotation per request and achieve a small fraction of the device's bandwidth. The kernel detects the pattern adaptively: it starts with a small window, and when its speculation keeps proving correct it grows the window up to a limit, then shrinks it again if the pattern breaks. Where it hurts is genuinely random access, such as a database index lookup that reads one 8 KB page and then jumps elsewhere - readahead fetches neighbouring pages that will never be used, wasting bandwidth, wasting cache space, and evicting pages that would have been useful. Applications can tell the kernel which case they are in with posix_fadvise, using POSIX_FADV_SEQUENTIAL to increase the window and POSIX_FADV_RANDOM to disable it, and can prefetch explicitly with the readahead call when they know what they will need. This is also part of why databases use O_DIRECT: they know their access pattern better than the kernel's heuristic can infer it, and they would rather issue their own prefetches than have the kernel guess."
      },
      {
        question: "How do dirty page thresholds cause latency spikes, and how do you fix them?",
        answer:
          "The kernel bounds dirty pages with two thresholds because unbounded dirty data means unbounded loss on crash and unbounded stall when it finally must be written. Below dirty_background_ratio nothing happens and writes are absorbed purely into memory. Above it, background writeback threads begin flushing asynchronously without blocking anyone. Above dirty_ratio, the kernel takes the drastic step of throttling the writing process inside the write call itself, blocking it until enough has been flushed. The resulting pathology is characteristic and common: a bulk writer such as a backup, a large file copy, or a data import writes at memory speed for several seconds, accumulating gigabytes of dirty pages that the device cannot possibly drain at that rate, then crosses the hard threshold and stalls for a long time while the backlog drains at device speed. Throughput graphs show a sawtooth, and because the throttling applies to writers generally, unrelated latency-sensitive services are punished for the bulk job's behaviour. The fixes all amount to bounding the dirty set so writeback proceeds steadily instead of in cliff-edge bursts: lower the thresholds system-wide, which trades peak absorption for smoothness; have the bulk writer call sync_file_range periodically to start writeback on what it has already written; use O_DIRECT so the bulk data never dirties the cache at all; and pair that with posix_fadvise DONTNEED so the job's clean pages do not evict everyone else's working set. On modern systems the byte-denominated variants, dirty_bytes and dirty_background_bytes, are usually preferable to the ratios because a percentage of a large memory is an enormous amount of data."
      },
      {
        question: "What is fsyncgate and why did it change how databases handle errors?",
        answer:
          "Fsyncgate is the name given to the discovery, publicised in 2018 through the PostgreSQL mailing lists, that Linux's fsync error reporting is fundamentally not retryable. When writeback of a dirty page fails - a device error, a disconnected network filesystem, a thin-provisioned volume out of space - the kernel records the error and reports it to the next fsync call on that file, then clears the flag. Worse, in older kernels the failed page could be marked clean and dropped, so the data was simply gone from memory as well as never having reached the device. The consequence is that a program which calls fsync, receives an error, logs it, and retries will receive success on the retry - not because the data was written, but because the error was already consumed and there is nothing dirty left to write. Any recovery logic built on retrying was therefore silently unsound, and worse, the error might be reported to a different file descriptor or a different process than the one that issued the write, since the error is attached to the file rather than the descriptor. PostgreSQL had been treating fsync failure as retryable and consequently could acknowledge transactions whose data was lost. The resolution was twofold: kernel changes to make error reporting per-descriptor and more consistent since Linux 4.13, and application changes to treat any fsync failure as unrecoverable - PostgreSQL now panics and recovers from the write-ahead log rather than attempting to continue. The general lesson for anyone writing durable storage code is that an fsync error means the state of the data is unknown and the only safe response is to fail hard and recover from a log, never to retry."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Rebello et al. - Can Applications Recover from fsync Failures? (USENIX ATC 2020)",
        insight: "Systematically shows that most real applications mishandle fsync errors, and is the rigorous follow-up to the fsyncgate discussion."
      },
      {
        source: "book",
        attribution: "Love - Linux Kernel Development, chapters on the page cache and writeback",
        insight: "The clearest short explanation of how the cache, dirty pages, and flusher threads fit together."
      },
      {
        source: "blog",
        attribution: "LWN.net coverage of writeback throttling and the dirty ratio tunables",
        insight: "Explains the sawtooth stall pathology and why byte-denominated thresholds replaced ratios on large-memory systems."
      }
    ]
  },
  {
    id: "topic-os-disk-scheduling-and-storage-stack",
    moduleId: "mod-os-file-systems-and-storage",
    title: "Disk Scheduling and the Block Layer",
    intuition:
      "Between the filesystem and the device sits the block layer, whose job is to decide which pending request goes next and how requests are merged. On rotating media that decision was worth an order of magnitude, because reordering requests to sweep the head in one direction avoids thousands of seeks, and an entire family of elevator algorithms exists for it. On NVMe the calculus inverts: the device has tens of thousands of IOPS and dozens of hardware queues, so the scheduler's job shifts from minimising mechanical motion to staying out of the way while still preventing one greedy process from starving everyone else.",
    complexity: {
      time:
        "On rotating media, seek time dominates at roughly 4 to 12 milliseconds and rotational latency adds about 4 milliseconds at 7200 rpm, so reordering to reduce seeks can improve throughput several-fold. An SSD serves a request in 50 to 100 microseconds and NVMe devices sustain hundreds of thousands of IOPS, at which point scheduler CPU overhead becomes the bottleneck rather than the device.",
      space:
        "Queue depth is the tunable that matters: too shallow and the device is idle between requests, too deep and latency balloons because a request waits behind everything already queued. The typical nr_requests default is 128 per queue, and blk-mq maintains one software queue per CPU mapped onto the device's hardware queues, which is what removed the single-queue lock contention that limited older kernels to a few hundred thousand IOPS."
    },
    lesson: [
      {
        title: "Elevator Algorithms and Why They Existed",
        content:
          "The classic schedulers all attack the same problem: a rotating disk's cost is dominated by moving the head, so the order in which requests are served matters far more than how quickly each is issued. First-come-first-served honours arrival order and produces wild head movement, sweeping back and forth across the platter. Shortest-seek-time-first always picks the nearest pending request, which minimises average seek but starves distant requests indefinitely if nearby ones keep arriving - the same starvation problem as shortest-job-first in CPU scheduling, and the same reason it is not used alone. SCAN, the elevator, moves the head steadily in one direction serving everything in its path, then reverses, which bounds the wait for any request at one full sweep. C-SCAN sweeps in one direction only and jumps back to the start, which gives more uniform waiting times because the ends of the disk are not visited twice as often as the middle. LOOK and C-LOOK are the practical refinements that reverse at the last pending request rather than at the physical end of the disk. All of these are worth understanding not because Linux uses them today but because the reasoning - throughput versus fairness versus starvation, and the fact that a greedy local optimum starves the tail - recurs at every layer of a system.",
        diagram: asciiDiagram(`Disk scheduling: the classic algorithms

  Pending cylinder requests: 98, 183, 37, 122, 14, 124, 65, 67
  Head starts at 53, disk has cylinders 0..199

  FCFS  - honour arrival order
    53──▶98──▶183──▶37──▶122──▶14──▶124──▶65──▶67
    total head movement: 640 cylinders   ◀── thrashing
    0        53        100       150       199
    │─────────┼─────────┼─────────┼─────────│
              ╰──────────────▶ 98
                              ╰──────▶ 183
              ◀──────────────────────╯ 37

  SSTF  - always take the NEAREST pending request
    53──▶65──▶67──▶37──▶14──▶98──▶122──▶124──▶183
    total: 236 cylinders    ◀── good average
    ▶ but STARVES distant requests if near ones keep arriving.
      Same failure as SJF in CPU scheduling.

  SCAN (the ELEVATOR) - sweep one way, serve everything, reverse
    53──▶65──▶67──▶98──▶122──▶124──▶183──▶199──▶37──▶14
    ▶ bounded wait: at most ONE full sweep.
    ├──────────────────────────────────────────▶ (up)
    ◀──────────────────────────────────────────┤ (then down)

  C-SCAN - sweep UP only, then JUMP back to 0
    53──▶65──▶...──▶183──▶199 ═══jump═══▶ 0──▶14──▶37
    ▶ more UNIFORM waiting: the middle is not favoured over
      the edges the way plain SCAN favours it.

  LOOK / C-LOOK - reverse at the LAST REQUEST, not at the
                  physical end. The versions actually used.
    53──▶...──▶183 ═══jump═══▶ 14──▶37   (no trip to 199)

  ▶ The lesson that outlives the hardware:
      greedy-nearest maximises throughput and starves the tail;
      sweeping bounds the tail and costs a little throughput.
    Exactly the trade-off in CPU scheduling, in load balancing,
    and in request routing.`)
      },
      {
        title: "The Modern Linux Block Layer: blk-mq and Its Schedulers",
        content:
          "Modern Linux replaced the single request queue with blk-mq, a multi-queue design with one software queue per CPU feeding the device's hardware queues, because a single lock-protected queue could not scale past a few hundred thousand IOPS and NVMe devices support up to 65,535 queues. On top of that sit three schedulers with clearly different purposes. The none scheduler does no reordering at all and simply passes requests through, which is correct for NVMe where the device reorders internally and any host-side work is pure CPU overhead. The mq-deadline scheduler maintains separate read and write queues sorted by sector, sweeps them like an elevator, but attaches an expiry deadline to each request - typically 500 milliseconds for reads and 5 seconds for writes - and when a deadline passes it services that request out of order, which bounds worst-case latency and prevents starvation while preserving most of the throughput benefit of sorting. BFQ, the budget fair queueing scheduler, allocates disk time proportionally between processes and is oriented toward desktop interactivity, guaranteeing that a foreground application stays responsive while a background job writes heavily, at a real CPU cost that makes it unsuitable for high-IOPS server workloads. The rule of thumb is none for NVMe, mq-deadline for SATA SSDs and general server use, and BFQ for interactive desktops with rotating or slow storage.",
        codeExample: `# Inspecting and tuning the block layer.

$ cat /sys/block/nvme0n1/queue/scheduler
[none] mq-deadline kyber bfq        # brackets = active

$ echo mq-deadline > /sys/block/sda/queue/scheduler

# Queue depth: the latency/throughput dial
$ cat /sys/block/sda/queue/nr_requests
128
#   deeper ──▶ more merging, better throughput, WORSE latency
#   shallower ──▶ lower latency, device may go idle

$ cat /sys/block/sda/queue/rotational
0                                    # 0 = non-rotating (SSD)
#   udev uses this to pick scheduler defaults

$ cat /sys/block/sda/queue/read_ahead_kb
128                                  # readahead window

# mq-deadline expiry knobs (milliseconds)
$ cat /sys/block/sda/queue/iosched/read_expire     # 500
$ cat /sys/block/sda/queue/iosched/write_expire    # 5000
#   reads expire sooner because a read is almost always
#   SYNCHRONOUS - a thread is blocked on it - while a write
#   has usually already returned to the application.

# MEASURING - the numbers that identify the bottleneck
$ iostat -x 1
#   r/s w/s      request rate
#   rareq-sz     average request size ◀── small = poor merging
#   await        avg wait INCLUDING queueing
#   aqu-sz       average queue depth
#   %util        percentage of time with I/O in flight
#                ◀── MISLEADING on SSDs: a device serving 32
#                    parallel requests and one serving 1 both
#                    show 100%, so %util does NOT mean saturated

$ blktrace -d /dev/sda -o - | blkparse -i -   # per-request trace
$ biolatency-bpfcc                            # latency histogram

# CGROUP v2 I/O control - the real answer to "one job is
# starving the others"
$ echo "259:0 rbps=10485760 wbps=10485760" \\
      > /sys/fs/cgroup/backup/io.max        # hard bandwidth cap
$ echo "259:0 riops=1000"  > .../io.max     # IOPS cap
$ echo "default 100" > /sys/fs/cgroup/db/io.weight  # proportional`
      },
      {
        title: "The Whole Stack, and Where Latency Actually Comes From",
        content:
          "A single read passes through more layers than most people expect, and each one can be the source of a latency problem. The system call enters the VFS, which dispatches to the filesystem; the filesystem consults the page cache and on a miss translates a file offset into a block number; the block layer builds a request, merges it with adjacent pending requests if possible, and hands it to the scheduler; the driver submits it to the device; and on completion an interrupt or polled completion propagates back up. Optional layers stack in between - device mapper for LVM, dm-crypt for encryption, MD for software RAID, a network protocol for iSCSI or NBD - and each adds latency and can add its own queue. When diagnosing, the useful discipline is to measure at more than one layer, because the same symptom has very different causes: high await with a large queue depth means the device is genuinely saturated, high await with a shallow queue means individual requests are slow, and high latency at the application with low latency at the device means the time is being spent above the block layer, in the filesystem, in a lock, or in dirty page throttling. Small average request sizes point at poor merging, often caused by an application issuing scattered small writes or by a fragmented file, and the fix belongs at that level rather than in the scheduler.",
        diagram: asciiDiagram(`The storage stack, top to bottom

  application
      │  read() / write() / io_uring submission
      ▼
  ┌─────────────────────────────────────────────┐
  │ VFS - path resolution, dentry cache, generic│
  │       read/write, permission checks         │
  └─────────────────────────────────────────────┘
      │
      ▼
  ┌─────────────────────────────────────────────┐
  │ PAGE CACHE  ──▶ HIT? return, done (~1 us)   │
  └─────────────────────────────────────────────┘
      │ miss
      ▼
  ┌─────────────────────────────────────────────┐
  │ FILESYSTEM - ext4 / XFS / btrfs             │
  │   file offset ──▶ block number (extents)    │
  │   journal, allocation, delayed allocation   │
  └─────────────────────────────────────────────┘
      │
      ▼
  ┌─────────────────────────────────────────────┐
  │ optional: dm-crypt │ LVM │ MD RAID │ iSCSI  │
  │   each adds latency AND its own queue       │
  └─────────────────────────────────────────────┘
      │
      ▼
  ┌─────────────────────────────────────────────┐
  │ BLOCK LAYER (blk-mq)                        │
  │   per-CPU software queues ──▶ hw queues     │
  │   MERGE adjacent requests                   │
  │   SCHEDULER: none / mq-deadline / bfq       │
  └─────────────────────────────────────────────┘
      │
      ▼
  ┌─────────────────────────────────────────────┐
  │ DRIVER ──▶ DEVICE                           │
  │   NVMe: up to 65,535 queues x 65,536 depth  │
  │   completion via interrupt, or POLLED for   │
  │   the lowest latency                        │
  └─────────────────────────────────────────────┘

  DIAGNOSING - measure at TWO layers, not one
  ┌────────────────────────┬──────────────────────────────────┐
  │ symptom                │ meaning                          │
  ├────────────────────────┼──────────────────────────────────┤
  │ high await, deep queue │ device genuinely SATURATED       │
  │ high await, shallow q  │ each request is SLOW (bad device,│
  │                        │ or a slow layer beneath)         │
  │ slow app, fast device  │ time is ABOVE the block layer:   │
  │                        │ locks, fsync, dirty throttling,  │
  │                        │ filesystem metadata              │
  │ tiny rareq-sz          │ poor MERGING - scattered small   │
  │                        │ writes, or a fragmented file     │
  └────────────────────────┴──────────────────────────────────┘

  ▶ %util is a LIE on parallel devices. 100% means "at least
    one request in flight", not "saturated".`)
      }
    ],
    examples: [
      {
        title: "Switching an NVMe device from BFQ to none doubles throughput",
        input: "A database on NVMe shows high system CPU and lower IOPS than the device is rated for.",
        output: "Scheduler CPU cost was the bottleneck, not the device.",
        explanation:
          "Step 1: BFQ performs per-process accounting and sorting on every request, which costs meaningful CPU per I/O.\nStep 2: At hundreds of thousands of IOPS that per-request cost becomes the limiting factor.\nStep 3: The device reorders internally anyway, so host-side sorting buys nothing.\nStep 4: Setting the scheduler to none removes the overhead; the general rule is none for NVMe, mq-deadline for SATA, BFQ only where desktop interactivity matters."
      },
      {
        title: "A backup job starving an interactive database",
        input: "Query latency rises from 2 ms to 400 ms whenever the nightly backup runs.",
        output: "The backup's queued requests sit ahead of every database request.",
        explanation:
          "Step 1: The backup issues large sequential reads continuously, filling the request queue.\nStep 2: Each database request must wait behind whatever is already queued, so its latency is set by queue depth, not by device speed.\nStep 3: mq-deadline's read expiry limits the worst case but does not give proportional isolation.\nStep 4: The correct fix is cgroup v2 io.max or io.weight to cap or proportionally allocate the backup's bandwidth, plus ionice where BFQ is in use."
      },
      {
        title: "iostat shows 100 percent util but the device is not busy",
        input: "An SSD reports %util of 100 while latency is low and throughput is far below rated.",
        output: "%util measures time with at least one request in flight, not saturation.",
        explanation:
          "Step 1: The metric was designed for single-request rotating devices where one in-flight request did mean busy.\nStep 2: An NVMe device serving 32 requests in parallel and one serving a single request both report 100 percent.\nStep 3: The useful signals are queue depth, average wait, and comparison against the device's rated IOPS.\nStep 4: Reading %util as saturation leads to replacing hardware that was never the bottleneck, which is a common and expensive misdiagnosis."
      }
    ],
    tips: [
      "Name the schedulers with their purpose - none for NVMe, mq-deadline for general use, BFQ for desktop interactivity - rather than reciting all of them.",
      "Explain SSTF's starvation problem by analogy to shortest-job-first; interviewers reward connecting the two scheduling domains.",
      "When asked to fix I/O interference between workloads, reach for cgroup v2 io.max rather than the scheduler."
    ],
    tricks: [
      "%util does not mean saturated on any device that serves requests in parallel, which is every SSD.",
      "mq-deadline expires reads far sooner than writes because a read almost always has a thread blocked on it.",
      "Queue depth is the direct latency-versus-throughput dial: deeper merges better and waits longer."
    ],
    memoryAids: [
      "FCFS thrashes, SSTF starves, SCAN sweeps, C-SCAN sweeps fairly, LOOK does not visit empty ends.",
      "none for NVMe, deadline for SATA, BFQ for the desktop.",
      "Deep queue plus high wait means saturated; shallow queue plus high wait means slow."
    ],
    interviewPatterns: [
      "Algorithmic: compute total head movement for FCFS, SSTF, SCAN, and C-SCAN on a request list - a standard exam-style question.",
      "Diagnostic: 'storage latency spiked, walk me through your investigation' - layer-by-layer measurement.",
      "Frequency and companies: Tier 2 generally, Tier 1 for SRE, storage, and database infrastructure roles."
    ],
    practiceProblems: [
      "Head at cylinder 53, requests 98, 183, 37, 122, 14, 124, 65, 67 on a 0 to 199 disk. Compute total head movement for FCFS and SSTF. Answer: FCFS serves in arrival order, giving movements of 45, 85, 146, 85, 108, 110, 59, and 2, for a total of 640 cylinders. SSTF always takes the nearest pending request, giving the order 65, 67, 37, 14, 98, 122, 124, 183 with movements of 12, 2, 30, 23, 84, 24, 2, and 59, for a total of 236 cylinders - substantially better on average. The point of the comparison is not the arithmetic but the trade-off it exposes: SSTF's advantage comes from greedily serving the local neighbourhood, which is exactly why a stream of requests near the head can starve one at cylinder 183 indefinitely, and why real schedulers use a sweep with deadlines instead.",
      "Why is the none scheduler appropriate for NVMe? Answer: Because host-side reordering solves a problem NVMe does not have and costs something it cannot afford. There are no seeks, so ordering requests by sector buys nothing in mechanical terms; the device has many hardware queues and reorders internally with far better knowledge of its own flash layout than the host has; and at hundreds of thousands of IOPS the per-request CPU cost of sorting and accounting becomes the actual bottleneck. Merging adjacent requests still happens in the block layer regardless of scheduler, so the useful part is retained. Where none is wrong is when you need fairness between workloads on a shared device, but even then the right tool is cgroup v2 io.max or io.weight rather than a sorting scheduler.",
      "Query latency degrades whenever a batch job runs. How do you isolate them? Answer: The mechanism is queueing - the batch job fills the request queue and every interactive request waits behind it, so latency is determined by queue depth rather than device speed. Scheduler choice helps only marginally, since mq-deadline bounds the worst case but does not allocate proportionally. The real tool is cgroup v2 I/O control: io.max sets a hard bandwidth or IOPS ceiling on the batch job's cgroup, and io.weight allocates capacity proportionally when the device is contended, which is preferable because it lets the batch job use idle capacity. Reducing nr_requests lowers the maximum queueing delay at some throughput cost. Complementary application-level fixes are to have the batch job use O_DIRECT so it does not evict the database's page cache, and to bound its dirty pages so it does not trigger writeback throttling that stalls unrelated writers."
    ],
    faq: [
      {
        question: "Why did SSTF never become the default despite minimising seek time?",
        answer:
          "Because it starves, and the starvation is unbounded rather than merely unfair. SSTF picks whichever pending request is closest to the current head position, which does minimise average seek distance for a fixed set of requests, but real workloads are not a fixed set - requests keep arriving. If a process is reading a region near the head's current position, its requests are always the nearest ones, so they are always chosen, and a request for a distant cylinder can wait indefinitely no matter how long it has been queued. This is structurally identical to shortest-job-first in CPU scheduling: both are optimal for average-case metrics and both achieve that optimum by systematically deferring the unlucky, and in both cases the tail latency is unbounded rather than merely bad. Because storage latency is directly visible to users - a request that waits five seconds is a page that does not render - unbounded tail latency is unacceptable in a way that a slightly worse average is not. SCAN and its variants fix this by imposing a structure that guarantees progress: the head sweeps in one direction serving whatever is in its path, so any request waits at most one sweep. Linux's mq-deadline takes the same insight further by keeping the sorted sweep for throughput but attaching an expiry to each request, so the ordering is used when it is free and abandoned the moment it would cause a deadline miss. That pattern - optimise greedily but bound the worst case with a deadline - is worth carrying to any scheduling problem."
      },
      {
        question: "What changed with blk-mq and why was it necessary?",
        answer:
          "The original Linux block layer had a single request queue per device protected by a single lock, which was entirely adequate when a fast device delivered a few hundred IOPS and every request cost milliseconds of mechanical motion. NVMe broke that assumption completely: a modern device sustains hundreds of thousands to millions of IOPS and exposes up to 65,535 hardware queues, each with a depth of up to 65,536, specifically so that many CPUs can submit concurrently without coordinating. Against that, a single shared lock becomes the bottleneck - every core contends for it on every submission and every completion, cache lines bounce between sockets, and measured throughput plateaus far below what the device can do. blk-mq restructures this into two levels: a software staging queue per CPU, where submission happens without cross-CPU contention because each core has its own, and a set of hardware dispatch queues mapped onto the device's own queues, ideally one per CPU so completion interrupts are handled on the core that submitted the request and the data is already cache-warm. Merging and scheduling still happen, but within the per-CPU structures rather than globally. The schedulers were rewritten to fit the new model, which is why the modern names are mq-deadline and kyber rather than the older cfq and deadline, and why none exists as a first-class choice - for a device that reorders internally and needs no fairness arbitration, the fastest scheduler is no scheduler."
      },
      {
        question: "How does mq-deadline balance throughput against latency?",
        answer:
          "It keeps two views of the pending requests simultaneously and switches between them based on deadlines. The first view is sorted by sector, which is the elevator ordering that maximises throughput by serving requests in a sweep and avoiding head movement. The second view is a FIFO list per direction, with each request stamped with an expiry time when it arrives - by default 500 milliseconds for reads and 5000 for writes. Normally the scheduler dispatches from the sorted view, getting the throughput benefit. But before each dispatch it checks whether the head of either FIFO has expired, and if so it services that request immediately regardless of where the head is, then resumes sweeping from the new position. The effect is that ordering is exploited whenever it is free and abandoned exactly when it would cause a starvation event, so the worst-case latency is bounded by the deadline rather than by the arrival pattern. The asymmetry between the read and write deadlines is deliberate and worth explaining: a read is nearly always synchronous, with an application thread blocked waiting for it, so delaying it delays real work; a write has usually already returned to the application from the page cache, so the writer is not waiting and a longer deadline costs little. The scheduler also caps how many requests it will serve from the sorted order before forcing a check, preventing a long sweep from itself becoming a starvation source."
      },
      {
        question: "Why is %util misleading, and what should you look at instead?",
        answer:
          "%util reports the fraction of wall-clock time during which at least one I/O request was in flight to the device. On a rotating disk that could only serve one request at a time, this was a genuine utilisation measure: 100 percent meant the device was continuously busy and could do no more. On any device that serves requests in parallel - which means every SSD, and emphatically every NVMe device with dozens of queues - the metric loses its meaning entirely. A device serving a single request at a time and a device serving thirty-two concurrently both report 100 percent, even though the first is using a small fraction of its capability. Teams routinely misread this as saturation and conclude that storage is the bottleneck, sometimes replacing hardware that was never limiting anything. The metrics that remain meaningful are average queue depth, which tells you how much work is actually outstanding; await, the average time a request spends waiting including queueing, which is what latency-sensitive workloads actually feel; the average request size, which reveals whether merging is working or whether the application is issuing scattered small I/Os; and the achieved IOPS and throughput compared against the device's rated figures. The diagnostic combination is the useful part: a deep queue with a high await means the device really is saturated, whereas a shallow queue with a high await means each individual request is slow and the problem lies in the device or a layer beneath it such as encryption, RAID, or a network-backed volume."
      },
      {
        question: "What is the practical difference between tuning the scheduler and using cgroup I/O control?",
        answer:
          "They solve different problems and are frequently confused. The scheduler decides the order in which already-submitted requests are dispatched, optimising for device characteristics: sweep ordering for rotating media, deadlines to bound starvation, or nothing at all for devices that reorder internally. It has no notion of which workload deserves what share of the device, beyond BFQ's process-level fairness, and it cannot prevent a workload from submitting more work than the device can absorb. cgroup v2 I/O control operates at the level of the workload rather than the request, and it is the correct tool when the question is 'this batch job is hurting my database'. io.max imposes hard ceilings on bandwidth and IOPS per device per cgroup, which is appropriate when you want a firm guarantee and are willing to leave capacity idle. io.weight allocates proportionally when the device is contended, so the batch job can consume everything available when the database is quiet and is squeezed back automatically when it is not, which is usually the better default. io.latency and io.cost extend this to latency targets, throttling other cgroups when a protected one's latency degrades. The practical implication is that scheduler tuning is about matching the device, whereas cgroup control is about matching your policy between workloads, and reaching for the scheduler to solve an interference problem generally produces disappointment - it can bound the worst case but it cannot enforce a share."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Bjorling et al. - Linux Block IO: Introducing Multi-queue SSD Access on Multi-core Systems (SYSTOR 2013)",
        insight: "The design paper for blk-mq, quantifying exactly how the single-queue lock limited throughput on many-core systems."
      },
      {
        source: "book",
        attribution: "Gregg - Systems Performance, chapters on disks and the block layer",
        insight: "The definitive treatment of why %util misleads on parallel devices and which metrics replace it."
      },
      {
        source: "note",
        attribution: "Linux kernel Documentation/block and cgroup-v2 I/O controller documentation",
        insight: "Authoritative reference for the sysfs queue tunables and for io.max, io.weight, and io.latency semantics."
      }
    ]
  }
];
