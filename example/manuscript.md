### TypeScript (line-numbers)

```typescript {class="line-numbers"}
(function main(): void {
  console.log("Hello world");
})();
```

### C (diff-highlight)

```diff-c {class="diff-highlight"}
  int main(void) {
-   printf("Hello world\n");
+   return 0;
  }
```

### OCaml (not supported by refractor)

```ocaml
let () = print_endline "Hello world"
```

### Lua (file-highlight, specify range)

<pre data-src="hello.lua" data-range="2,2"></pre>
