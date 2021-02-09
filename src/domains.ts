import { select } from 'd3';
import { Domain } from './interfaces';

export function draw_protDomains (selector : string,
                    domains : Domain[],
                    lenseq : number,
                    width : number, 
                    height : number, 
                    palette : any,
                    urlRoot? : string) {
    function scale(num : number, 
                   inSize : number,
                   outSize : number) {
        return +num * outSize / inSize;
    }
    function draw_seqLine(g : d3.Selection<SVGElement>, 
                          width : number,
                          height : number) {
        g.append("line")
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("x1", 0)
            .attr("y1", height / 2)
            .attr("x2", width)
            .attr("y2", height / 2);
    }
    function draw_legend(selector : string, 
                         domains : Domain[], 
                         palette : any,
                         urlRoot? : string) {
        var legend = select(selector)
         .append("div")
         .attr("class", "dom-legend");
        var doms = new Set();
        domains.forEach((d : Domain) => {
            if (d.class && d.class != "") {
                doms.add(d.class)
            }
        })
        doms.forEach((d : string) => {
            let l = legend.append("div")
                     .attr('class', 'd-inline px-2');
            l.append('svg')
             .attr('width', 10)
             .attr('height', 10)
             .attr('class', 'mr-2')
             .append('circle')
             .attr("r", 5)
             .attr("cx", 5)
             .attr("cy", 5)
             .attr("fill", palette(d));
            let t = l.append('div')
                     .attr('class', 'd-inline');
            if (urlRoot) {
                t.append('a')
                  .attr('href', urlRoot + d)
                  .attr('target', '_blank')
                  .attr('class', 'secondary-link')
                  .text(d);
            } else {
                t.text(d);
            }
        })
    }
    function draw_domains(g : d3.Selection<SVGElement>,
                          domains : Domain[], 
                          lenseq : number, 
                          width : number, 
                          height : number, 
                          palette : any) {
        g.selectAll('circle')
            .data(domains.filter((d : Domain) => d.shape == "circle" ))
            .enter().append('circle')
            .attr("r", 4)
            .attr("cx", (d:Domain) => { return scale(+d.c, lenseq, width)})
            .attr("cy", height/2)
            .attr("fill", (d:Domain) => { return palette(d.class) });
        g.selectAll('rect')
            .data(domains.filter((d:Domain) => d.shape == "rect" ))
            .enter().append('rect')
            .attr("x", (d:Domain) => { return scale(+d.start, lenseq, width); })
            .attr("y", 0)
            .attr("width", (d:Domain) => { return scale(+d.end - +d.start, lenseq, width)})
            .attr("height", height)
            .attr("fill", (d:Domain) => { return palette(d.class) });
    }
    var g = select(selector)
              .append('svg:svg')
              .attr("width", width)
              .attr("height", height)
              .append('svg:g')
                .attr("transform", "translate(" + 5 + ", 0)");
    draw_seqLine(g, width, height);
    draw_domains(g, domains, lenseq, width, height, palette);
    draw_legend(selector, domains, palette, urlRoot);
}
