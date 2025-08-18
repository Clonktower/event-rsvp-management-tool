{
  description = "devshell flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
    # Used sparingly for more up to date versions
    nixpkgs-unstable.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flakeUtils.url = "github:numtide/flake-utils";
  };

  outputs = {
    nixpkgs,
    flakeUtils,
    nixpkgs-unstable,
    ...
  }:
    flakeUtils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      formatter = pkgs.alejandra;
      devShells.default = pkgs.mkShell {
        name = "devshell";

        buildInputs = with pkgs;
          [
            # pnpm_10 # Maybe move to this, easier than yarn IMO.
            nodejs_20
	    yarn-berry
          ];

        shellHook = ''
          echo Printing versions:
          echo "node: $(node -v)"
          echo "pnpm: $(pnpm --version)"
          echo "python: $(python --version)"
          echo 'Happy hacking!'
          echo;
        '';
      };
    });
}
