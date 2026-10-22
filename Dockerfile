# L'image du jeu. On fabrique la page et le serveur avec les outils du projet (npm run construire), puis on ne garde que dist/ et
# Node : ni npm, ni sources, ni outils. Le serveur n'a besoin de rien d'autre, `ws` est dans serveur.mjs. Il tourne sans droits ;
# compose.yaml lui donne l'utilisateur à qui appartiennent les comptes, et un système de fichiers en lecture seule.
#
#   docker build -t honear .        (deploiement/mettre-en-ligne.sh le fait, étiqueté à son commit)

# Node 24 (LTS), Debian 13, figé à son empreinte : la même image à chaque construction.
ARG NODE=node:24.22.1-trixie-slim@sha256:43b9ba1142b8dcf33fa8f922ca1be85714adc444e0586c7cf7726daaeabc1bea

FROM ${NODE} AS construction
WORKDIR /projet
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.page.json ./
COPY polices polices
COPY outils outils
COPY src src
RUN npm run construire

FROM ${NODE}
# Rien dans l'image qui sache installer quoi que ce soit.
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
  /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
WORKDIR /jeu
COPY --from=construction /projet/dist/ ./
ENV NODE_ENV=production \
  PORT=8080 \
  HOTE=0.0.0.0 \
  COMPTES=/donnees/comptes.json
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/sante').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "/jeu/serveur.mjs"]
