from __future__ import division
import matplotlib.pyplot as P
from mplstereonet.stereonet_math import line, pole
import numpy as N
from matplotlib.patches import Polygon
from matplotlib.ticker import FuncFormatter

yloc = P.MaxNLocator(4)
xloc = P.MaxNLocator(5)

def func(val, pos):
    return u"{0}\u00b0".format(val)

formatter = FuncFormatter(func)

def trend_plunge(orientation, *args, **kwargs):
    ax = kwargs.pop("ax",P.gca())
    levels = kwargs.pop("levels",[1])
    #kwargs["linewidth"] = 0
    defaults = dict(
        linewidth=0)
    kwargs.update({k:kwargs.pop(k,v)
        for k,v in defaults.items()})

    a = kwargs.pop("alpha",[0.7])
    if len(a) != len(levels):
        a = [a]*len(levels)

    for i,level in enumerate(levels):
        el = map(N.degrees,orientation.error_ellipse(vector=True, level=level))
        lat,lon = line(el[1], el[0])

        e = Polygon(zip(lat,lon), alpha=a[i], **kwargs)
        ax.add_patch(e)

def normal(orientation, *args, **kwargs):
    ax = kwargs.pop("ax",P.gca())
    levels = kwargs.pop("levels",[1])
    kwargs["linewidth"] = 0

    a = kwargs.pop("alpha",0.7)
    if len(a) != len(levels):
        a = [a]*len(levels)

    for i,level in enumerate(levels):
        _ = orientation.error_ellipse(vector=True, level=level)
        el = map(N.degrees,_)
        lat,lon = line(90-el[1], 180+el[0])
        e = Polygon(zip(lat,lon), alpha=a[i], **kwargs)
        ax.add_patch(e)

def strike_dip(orientation, *args, **kwargs):
    ax = kwargs.pop("ax",P.gca())
    levels = kwargs.pop("levels",[1])
    spherical = kwargs.pop("spherical", False)
    kwargs["linewidth"] = 0

    a = kwargs.pop("alpha",[1])
    if len(a) != len(levels):
        a = [a]*len(levels)

    for i,level in enumerate(levels):
        el = map(N.degrees,orientation.error_ellipse(
            level=level,
            spherical=spherical
            ))

        if spherical:
            lat,lon = line(el[1], el[0])
        else:
            lat = el[1]
            lon = el[0]

        e = Polygon(zip(lat,lon), alpha=a[i], **kwargs)
        ax.add_patch(e)

def setup_figure(*args, **kwargs):
    projection = kwargs.pop("projection","stereonet")
    fig = P.figure(*args, **kwargs)
    ax = fig.add_subplot(111, projection=projection)
    return fig,ax

def error_ellipse(fit):
    fig, ax = setup_figure(projection=None, figsize=(4,3))
    ax.yaxis.set_major_locator(yloc)
    ax.xaxis.set_major_locator(xloc)
    ax.xaxis.set_major_formatter(formatter)
    ax.yaxis.set_major_formatter(formatter)
    ax.invert_yaxis()

    strike_dip(fit,
        ax=ax,
        levels=[1,2,3],
        alpha=[0.5,0.4,0.3],
        spherical=False,
        facecolor='red')

    ax.autoscale_view()
    ax.set_ylabel("Dip")
    ax.set_xlabel("Strike")
    return fig

def plot_aligned(pca):
    """ Plots the residuals of a principal component
        analysis of attiude data.
    """
    A = pca.rotated()
    fig, axes = P.subplots(3,1,
            sharex=True, frameon=False)
    fig.subplots_adjust(hspace=0, wspace=0.1)
    kw = dict(c="#555555", s=40, alpha=0.5)

    #lengths = attitude.pca.singular_values[::-1]
    lengths = (A[:,i].max()-A[:,i].min() for i in range(3))

    titles = (
        "Plan view (axis 2 vs. axis 1)",
        "Long cross-section (axis 3 vs. axis 1)",
        "Short cross-section (axis 3 vs. axis 2)")

    for title,ax,(a,b) in zip(titles,axes,
            [(0,1),(0,2),(1,2)]):
        ax.scatter(A[:,a], A[:,b], **kw)
        ax.set_aspect("equal")
        ax.text(0,1,title,
            verticalalignment='top',
            transform=ax.transAxes)
        ax.autoscale(tight=True)
        ax.yaxis.set_ticks([])
        for spine in ax.spines.itervalues():
            spine.set_visible(False)
    ax.set_xlabel("Meters")
    return fig
