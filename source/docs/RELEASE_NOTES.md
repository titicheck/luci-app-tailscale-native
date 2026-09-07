# dev7 Candidate Notes

- separates Native package installation from Core installation
- adds explicit zero-argument `core_install` RPC
- adds Overview install action shown only when Core is absent
- reuses the already validated official-stable checksum-verified Core helper unchanged
- preserves no-feed-dependency architecture and Native/Core uninstall isolation
